<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\AuthorizesPatientAccess;
use App\Models\Medication;
use App\Models\MissedTask;
use App\Services\TaskMissService;
use App\Services\TaskTimingService;
use Illuminate\Http\Request;
use Carbon\Carbon;

class MedicationController extends Controller
{
    use AuthorizesPatientAccess;
    protected $medService;

    public function __construct(\App\Services\MedicationService $medService)
    {
        $this->medService = $medService;
    }

    public function index(Request $request)
    {
        $targetUserId = $request->user_id;

        // Verify that the authenticated user can view this user's data
        if ($request->user()->id != $targetUserId) {
            $isLinked = \Illuminate\Support\Facades\DB::table('user_relationships')
                ->where('user_id', $targetUserId)
                ->where('relative_id', $request->user()->id)
                ->exists();

            if (!$isLinked) {
                return response()->json(['error' => 'Unauthorized'], 403);
            }
        }

        return $this->medService->getPatientSchedule($targetUserId);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'user_id' => 'required',
            'name' => 'required|string',
            'dosage' => 'required|string',
            'instructions' => 'nullable|string',
            'frequency_data' => 'required|array',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
        ]);

        // Only Caregiver can create medications for linked users
        $isCaretaker = \Illuminate\Support\Facades\DB::table('user_relationships')
            ->where('user_id', $request->user_id)
            ->where('relative_id', $request->user()->id)
            ->where('relation_type', 'caretaker')
            ->exists();

        if (!$isCaretaker && $request->user()->role !== 'admin') {
             return response()->json(['error' => 'Unauthorized'], 403);
        }

        $medication = Medication::create($validated);
        return response()->json($medication, 201);
    }

    public function update(Request $request, Medication $medication)
    {
        if ($request->user()->cannot('update', $medication)) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $medication->update($request->all());
        return response()->json($medication);
    }

    public function destroy(Request $request, Medication $medication)
    {
        if ($request->user()->cannot('delete', $medication)) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $medication->delete();
        return response()->json(null, 204);
    }

    public function take(Request $request, Medication $medication)
    {
        if (!$this->canAccessPatient($request->user(), $medication->user_id)) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $userTz = $request->timezone ?? $medication->user->timezone ?? config('app.timezone');
        $date = Carbon::now($userTz)->toDateString();
        $time = $request->scheduled_time;
        $normalized = strlen($time) === 5 ? $time . ':00' : $time;

        $isMissed = MissedTask::where('user_id', $medication->user_id)
            ->where('task_type', 'medication')
            ->where('task_id', $medication->id)
            ->where('scheduled_time', $normalized)
            ->where('missed_at_date', $date)
            ->exists();

        $minutesPastDue = TaskTimingService::minutesPastDue($normalized, $userTz);
        $isElderly = $request->user()->id === $medication->user_id;

        if (!TaskTimingService::canMarkComplete(false, $minutesPastDue)) {
            $grace = TaskTimingService::SCHEDULE_GRACE_MINUTES;
            return response()->json([
                'error' => "This dose opens {$grace} minutes before the scheduled time. Please wait for your flexible window.",
                'code' => 'task_not_due',
            ], 403);
        }

        if ($isElderly && !TaskTimingService::canElderlyComplete($isMissed, false, $minutesPastDue)) {
            $grace = TaskTimingService::SCHEDULE_GRACE_MINUTES;
            return response()->json([
                'error' => "Your flexible window (±{$grace} min) has passed. Ask your caregiver or family to mark this dose.",
                'code' => 'elderly_complete_blocked',
            ], 403);
        }

        \App\Models\CompletedTask::updateOrCreate([
            'user_id' => $medication->user_id,
            'task_type' => 'medication',
            'task_id' => $medication->id,
            'scheduled_time' => $normalized,
            'completed_at_date' => $date
        ]);

        TaskMissService::clearMissed($medication->user_id, 'medication', $medication->id, $normalized);

        \App\Services\CheckInSyncService::syncTaskToCheckIn($medication->user_id, 'medication', $medication->id, $date);

        return response()->json(['status' => 'success']);
    }

    public function miss(Request $request, Medication $medication)
    {
        if (!$this->canAccessPatient($request->user(), $medication->user_id)) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $time = $request->validate(['scheduled_time' => 'required'])['scheduled_time'];
        $userTz = $request->timezone ?? $medication->user->timezone ?? config('app.timezone');
        $normalized = strlen($time) === 5 ? $time . ':00' : $time;
        $minutesPastDue = TaskTimingService::minutesPastDue($normalized, $userTz);

        if (
            !$request->boolean('auto')
            && !TaskTimingService::canMarkMissed(false, false, $minutesPastDue)
        ) {
            return response()->json([
                'error' => 'You can mark a dose as missed once its scheduled time has passed.',
                'code' => 'task_not_due',
            ], 403);
        }

        $title = "Take {$medication->name} ({$medication->dosage})";
        $markedBy = $request->user()->id === $medication->user_id
            ? 'elderly'
            : ($request->user()->role === 'child' ? 'child' : 'caregiver');

        if ($request->boolean('auto')) {
            $markedBy = 'auto';
        }

        TaskMissService::recordMissed(
            $medication->user_id,
            'medication',
            $medication->id,
            $time,
            $title,
            $markedBy
        );

        return response()->json(['status' => 'missed']);
    }
}
