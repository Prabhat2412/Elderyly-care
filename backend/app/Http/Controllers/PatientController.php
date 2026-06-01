<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;

class PatientController extends Controller
{
    /**
     * List all patients for the authenticated caretaker.
     */
    public function index(Request $request)
    {
        return $request->user()->patients;
    }

    /**
     * Get details for a specific patient.
     */
    public function show(Request $request, User $patient)
    {
        // Security check: is this caretaker actually linked to this patient?
        if (!$request->user()->patients()->where('user_id', $patient->id)->exists()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        return [
            'patient' => $patient->load('medicalProfile'),
            'medications' => $patient->medications,
            'checkins' => $patient->checkins()->latest()->take(10)->get()
        ];
    }

    /**
     * Set the active patient for the session.
     */
    public function setActive(Request $request)
    {
        $request->validate(['patient_id' => 'required|exists:users,id']);
        
        $user = $request->user();

        // Security check: is this caretaker actually linked to this patient?
        if (!$user->patients()->where('user_id', $request->patient_id)->exists()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $user->active_elderly_id = $request->patient_id;
        $user->save();

        return response()->json(['message' => 'Active patient updated']);
    }

    /**
     * Get the AI health summary report for the patient.
     */
    public function aiSummary(Request $request, User $patient, \App\Services\AIReportService $aiReportService)
    {
        $requestingUser = $request->user();
        $isLinked = false;

        if ($requestingUser->id === $patient->id) {
            $isLinked = true;
        } elseif ($requestingUser->patients()->where('user_id', $patient->id)->exists()) {
            $isLinked = true;
        } else {
            $isLinked = \Illuminate\Support\Facades\DB::table('user_relationships')
                ->where('user_id', $patient->id)
                ->where('relative_id', $requestingUser->id)
                ->exists();
        }

        if (!$isLinked) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $report = $aiReportService->generateSummary($patient->id);

        if (!$report) {
            return response()->json([
                'summary' => 'No active health logs or check-ins found for the past 30 days.',
                'recommendations' => ['Encourage logging of daily health vitals and wellness surveys.'],
                'concern_level' => 'low'
            ]);
        }

        return response()->json($report);
    }
    /**
     * Get the timeline of events for the patient.
     */
    public function timeline(Request $request, User $patient)
    {
        $requestingUser = $request->user();
        
        // Security check
        if ($requestingUser->id !== $patient->id && !$requestingUser->patients()->where('user_id', $patient->id)->exists()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $date = $request->query('date', today()->toDateString());
        $isAllTime = $date === 'all';

        $events = collect();

        // 1. Completed Tasks
        $completedTasks = \App\Models\CompletedTask::where('user_id', $patient->id)
            ->when(!$isAllTime, fn($q) => $q->where('completed_at_date', $date))
            ->get();
            
        foreach ($completedTasks as $task) {
            $title = 'Task Completed';
            if ($task->task_type === 'medication') {
                $med = \App\Models\Medication::find($task->task_id);
                $title = $med ? "Took Medication: {$med->name}" : "Took Medication";
            } else {
                $routine = \App\Models\RoutineSchedule::find($task->task_id);
                $title = $routine ? "Completed Routine: {$routine->title}" : "Completed Routine";
            }
            
            $events->push([
                'id' => 'comp_' . $task->id,
                'type' => 'completed_task',
                'title' => $title,
                'timestamp' => \Carbon\Carbon::parse($task->completed_at_date . ' ' . ($task->scheduled_time ?? '00:00:00')),
                'meta' => ['sub_task_key' => $task->sub_task_key]
            ]);
        }

        // 2. Missed Tasks
        $missedTasks = \App\Models\MissedTask::where('user_id', $patient->id)
            ->when(!$isAllTime, fn($q) => $q->where('missed_at_date', $date))
            ->get();
            
        foreach ($missedTasks as $task) {
            $title = 'Task Missed';
            if ($task->task_type === 'medication') {
                $med = \App\Models\Medication::find($task->task_id);
                $title = $med ? "Missed Medication: {$med->name}" : "Missed Medication";
            } else {
                $routine = \App\Models\RoutineSchedule::find($task->task_id);
                $title = $routine ? "Missed Routine: {$routine->title}" : "Missed Routine";
            }

            $events->push([
                'id' => 'miss_' . $task->id,
                'type' => 'missed_task',
                'title' => $title,
                'timestamp' => \Carbon\Carbon::parse($task->missed_at_date . ' ' . ($task->scheduled_time ?? '00:00:00')),
                'meta' => ['marked_by' => $task->marked_by]
            ]);
        }

        // 3. Health Logs
        $healthLogs = \App\Models\HealthLog::where('user_id', $patient->id)
            ->when(!$isAllTime, fn($q) => $q->whereDate('created_at', $date))
            ->get();
            
        foreach ($healthLogs as $log) {
            $val = is_string($log->value) ? json_decode($log->value, true) : $log->value;
            $displayVal = is_array($val) ? collect($val)->map(fn($v, $k) => "$k: $v")->join(', ') : $val;
            
            $events->push([
                'id' => 'hl_' . $log->id,
                'type' => 'health_log',
                'title' => "Logged Vital: " . ucfirst(str_replace('_', ' ', $log->type)),
                'timestamp' => $log->created_at,
                'meta' => ['value' => $displayVal, 'unit' => $log->unit, 'notes' => $log->notes]
            ]);
        }

        // 4. Check-Ins
        $checkIns = \App\Models\CheckIn::where('user_id', $patient->id)
            ->when(!$isAllTime, fn($q) => $q->whereDate('created_at', $date))
            ->get();
            
        foreach ($checkIns as $checkIn) {
            $events->push([
                'id' => 'ci_' . $checkIn->id,
                'type' => 'check_in',
                'title' => "Daily Check-in",
                'timestamp' => $checkIn->created_at,
                'meta' => ['mood' => $checkIn->mood, 'symptoms' => $checkIn->symptoms]
            ]);
        }

        // 5. Alerts
        $alerts = \App\Models\Alert::where('user_id', $patient->id)
            ->when(!$isAllTime, fn($q) => $q->whereDate('created_at', $date))
            ->get();
            
        foreach ($alerts as $alert) {
            $events->push([
                'id' => 'al_' . $alert->id,
                'type' => 'alert',
                'title' => $alert->type === 'emergency' ? "Emergency Triggered!" : "Alert: " . ucfirst(str_replace('_', ' ', $alert->type)),
                'timestamp' => $alert->created_at,
                'meta' => ['message' => $alert->message, 'resolved' => $alert->resolved]
            ]);
        }

        $sortedEvents = $events->sortByDesc('timestamp')->values()->all();

        return response()->json($sortedEvents);
    }
}
