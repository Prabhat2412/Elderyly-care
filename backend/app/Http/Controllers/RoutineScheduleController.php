<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\AuthorizesPatientAccess;
use App\Models\RoutineSchedule;
use App\Models\CompletedTask;
use App\Models\MissedTask;
use App\Models\Medication;
use App\Models\HealthLog;
use App\Services\HealthLogAlertService;
use App\Services\TaskMissService;
use App\Services\TaskTimingService;
use App\Services\VitalReadingService;
use Illuminate\Http\Request;
use Carbon\Carbon;

class RoutineScheduleController extends Controller
{
    use AuthorizesPatientAccess;
    public function index(Request $request)
    {
        $userId = $request->user_id ?? $request->user()->id;
        $user = \App\Models\User::find($userId);
        $userTz = $user->timezone ?? 'UTC';
        $date = Carbon::now($userTz)->toDateString();

        $schedules = RoutineSchedule::where('user_id', $userId)
            ->where('is_active', true)
            ->get();

        $completedIds = CompletedTask::where('user_id', $userId)
            ->where('task_type', 'routine')
            ->where('completed_at_date', $date)
            ->pluck('task_id')
            ->toArray();

        return $schedules->map(function ($s) use ($completedIds) {
            $s->is_completed_today = in_array($s->id, $completedIds);
            return $s;
        });
    }

    public function dailyTasks(Request $request)
    {
        $userId = $request->user_id ?? $request->user()->id;
        $user = \App\Models\User::find($userId);
        $userTz = $user->timezone ?? 'UTC';
        $now = Carbon::now($userTz);
        $date = $now->toDateString();
        $dayOfWeek = strtolower($now->format('l'));

        // 1. Get Routine Schedules (including vitals)
        $schedules = RoutineSchedule::where('user_id', $userId)
            ->where('is_active', true)
            ->get();

        $completedTasks = CompletedTask::where('user_id', $userId)
            ->where('completed_at_date', $date)
            ->get();

        $missedTasks = MissedTask::where('user_id', $userId)
            ->where('missed_at_date', $date)
            ->get();

        $allDailyTasks = collect();

        foreach ($schedules as $s) {
            $times = [];
            if ($s->frequency_data) {
                $freq = $s->frequency_data;
                
                // Weekly check
                if (isset($freq['type']) && $freq['type'] === 'weekly') {
                    $days = $freq['days'] ?? [];
                    if (!in_array($dayOfWeek, $days)) continue;
                }

                $times = $freq['times'] ?? [];
            } elseif ($s->scheduled_time) {
                $times = [$s->scheduled_time];
            }

            foreach ($times as $time) {
                $formattedTime = strlen($time) === 5 ? $time . ":00" : $time;
                $minutesPastDue = TaskTimingService::minutesPastDue($formattedTime, $userTz);

                // If this is a vital_bundle, expand into one task per sub-metric
                if ($s->type === 'vital_bundle' && !empty($s->sub_tasks)) {
                    $bundleId = "bundle_{$s->id}_{$formattedTime}";

                    foreach ($s->sub_tasks as $subMetric) {
                        $subKey = $subMetric; // e.g. "blood_pressure", "heartbeat", "temp"

                        $isCompleted = $completedTasks->where('task_type', 'routine')
                            ->where('task_id', $s->id)
                            ->where('scheduled_time', $formattedTime)
                            ->where('sub_task_key', $subKey)
                            ->isNotEmpty();

                        $isMissed = $missedTasks->where('task_type', 'routine')
                            ->where('task_id', $s->id)
                            ->where('scheduled_time', $formattedTime)
                            ->where('sub_task_key', $subKey)
                            ->isNotEmpty();

                        $subLabel = VitalReadingService::metricLabel($subMetric);

                        $allDailyTasks->push([
                            'id' => "routine_{$s->id}_{$formattedTime}_{$subKey}",
                            'original_id' => $s->id,
                            'title' => "{$s->title} — {$subLabel}",
                            'type' => 'routine',
                            'category' => 'vital',
                            'metric_type' => $subMetric,
                            'sub_task_key' => $subKey,
                            'bundle_id' => $bundleId,
                            'bundle_title' => $s->title,
                            'scheduled_time' => $formattedTime,
                            'is_completed' => $isCompleted,
                            'is_missed' => $isMissed,
                            'marked_by' => $isMissed
                                ? $missedTasks->where('task_type', 'routine')->where('task_id', $s->id)->where('scheduled_time', $formattedTime)->where('sub_task_key', $subKey)->first()?->marked_by
                                : null,
                            'minutes_past_due' => $minutesPastDue,
                            'requires_reading' => true,
                        ]);
                    }
                } else {
                    // Standard single task (meal, hydration, activity, single vital)
                    $isCompleted = $completedTasks->where('task_type', 'routine')
                        ->where('task_id', $s->id)
                        ->where('scheduled_time', $formattedTime)
                        ->isNotEmpty();

                    $isMissed = $missedTasks->where('task_type', 'routine')
                        ->where('task_id', $s->id)
                        ->where('scheduled_time', $formattedTime)
                        ->isNotEmpty();

                    $allDailyTasks->push([
                        'id' => "routine_{$s->id}_{$formattedTime}",
                        'original_id' => $s->id,
                        'title' => $s->title,
                        'type' => 'routine',
                        'category' => $s->type,
                        'metric_type' => $s->metric_type,
                        'scheduled_time' => $formattedTime,
                        'is_completed' => $isCompleted,
                        'is_missed' => $isMissed,
                        'marked_by' => $isMissed
                            ? $missedTasks->where('task_type', 'routine')->where('task_id', $s->id)->where('scheduled_time', $formattedTime)->first()?->marked_by
                            : null,
                        'minutes_past_due' => $minutesPastDue,
                        'requires_reading' => VitalReadingService::requiresReading($s->type, $s->metric_type),
                    ]);
                }
            }
        }

        // 2. Get Medications
        $meds = Medication::where('user_id', $userId)
            ->where('is_active', true)
            ->get();

        foreach ($meds as $med) {
            $freq = $med->frequency_data;
            if (!$freq || !isset($freq['times'])) continue;

            // Weekly check
            if (isset($freq['type']) && $freq['type'] === 'weekly') {
                $days = $freq['days'] ?? [];
                if (!in_array($dayOfWeek, $days)) continue;
            }

            foreach ($freq['times'] as $time) {
                $formattedTime = strlen($time) === 5 ? $time . ":00" : $time;
                
                $isCompleted = $completedTasks->where('task_type', 'medication')
                    ->where('task_id', $med->id)
                    ->where('scheduled_time', $formattedTime)
                    ->isNotEmpty();

                $isMissed = $missedTasks->where('task_type', 'medication')
                    ->where('task_id', $med->id)
                    ->where('scheduled_time', $formattedTime)
                    ->isNotEmpty();

                $minutesPastDue = TaskTimingService::minutesPastDue($formattedTime, $userTz);

                $allDailyTasks->push([
                    'id' => "med_{$med->id}_{$formattedTime}",
                    'original_id' => $med->id,
                    'title' => "Take {$med->name} ({$med->dosage})",
                    'type' => 'medication',
                    'category' => 'pill',
                    'scheduled_time' => $formattedTime,
                    'is_completed' => $isCompleted,
                    'is_missed' => $isMissed,
                    'marked_by' => $isMissed
                        ? $missedTasks->where('task_type', 'medication')->where('task_id', $med->id)->where('scheduled_time', $formattedTime)->first()?->marked_by
                        : null,
                    'minutes_past_due' => $minutesPastDue,
                    'requires_reading' => false,
                ]);
            }
        }

        return $allDailyTasks->sortBy('scheduled_time')->values();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'user_id' => 'required|exists:users,id',
            'title' => 'required|string',
            'type' => 'required|string',
            'metric_type' => 'nullable|string',
            'frequency_data' => 'nullable|array',
            'scheduled_time' => 'nullable',
        ]);

        // Only Caretaker can create routines for linked users
        $isCaretaker = \Illuminate\Support\Facades\DB::table('user_relationships')
            ->where('user_id', $request->user_id)
            ->where('relative_id', $request->user()->id)
            ->where('relation_type', 'caretaker')
            ->exists();

        if (!$isCaretaker) {
             return response()->json(['error' => 'Unauthorized'], 403);
        }

        return RoutineSchedule::create($data);
    }

    public function complete(Request $request, RoutineSchedule $schedule)
    {
        if (!$this->canAccessPatient($request->user(), $schedule->user_id)) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $userTz = $request->timezone ?? $schedule->user->timezone ?? config('app.timezone');
        $date = Carbon::now($userTz)->toDateString();
        $time = $request->scheduled_time;
        $normalized = strlen($time) === 5 ? $time . ':00' : $time;
        $subTaskKey = $request->sub_task_key; // null for non-bundle tasks

        $missedQuery = MissedTask::where('user_id', $schedule->user_id)
            ->where('task_type', 'routine')
            ->where('task_id', $schedule->id)
            ->where('scheduled_time', $normalized)
            ->where('missed_at_date', $date);
        if ($subTaskKey) {
            $missedQuery->where('sub_task_key', $subTaskKey);
        }
        $isMissed = $missedQuery->exists();

        $minutesPastDue = TaskTimingService::minutesPastDue($normalized, $userTz);
        $isElderly = $request->user()->id === $schedule->user_id;

        if (!TaskTimingService::canMarkComplete(false, $minutesPastDue)) {
            $grace = TaskTimingService::SCHEDULE_GRACE_MINUTES;
            return response()->json([
                'error' => "This task opens {$grace} minutes before the scheduled time. Please wait for your flexible window.",
                'code' => 'task_not_due',
            ], 403);
        }

        if ($isElderly && !TaskTimingService::canElderlyComplete($isMissed, false, $minutesPastDue)) {
            $grace = TaskTimingService::SCHEDULE_GRACE_MINUTES;
            return response()->json([
                'error' => "Your flexible window (±{$grace} min) has passed. Ask your caregiver or family to mark this complete.",
                'code' => 'elderly_complete_blocked',
            ], 403);
        }

        // Determine the effective metric type: for bundles, use sub_task_key; for singles, use schedule's metric_type
        $effectiveMetricType = $subTaskKey ?? $schedule->metric_type;
        $requiresReading = $subTaskKey
            ? true
            : VitalReadingService::requiresReading($schedule->type, $schedule->metric_type);

        $healthLog = null;
        if ($requiresReading) {
            if (!$request->has('reading')) {
                return response()->json([
                    'error' => 'A vital reading is required to complete this task.',
                    'code' => 'vital_reading_required',
                ], 422);
            }

            $request->validate([
                'reading' => 'required|array',
                'reading.value' => 'required',
                'reading.notes' => 'nullable|string|max:500',
            ]);

            $metricType = VitalReadingService::normalizeMetricType($effectiveMetricType);
            $normalizedReading = VitalReadingService::validateAndNormalize(
                $metricType,
                $request->input('reading.value')
            );

            $healthLog = HealthLog::create([
                'user_id' => $schedule->user_id,
                'source_task_type' => 'routine',
                'source_task_id' => $schedule->id,
                'scheduled_time' => $normalized,
                'logged_date' => $date,
                'recorded_by' => $request->user()->id,
                'type' => $metricType,
                'value' => $normalizedReading['value'],
                'unit' => $normalizedReading['unit'],
                'notes' => $request->input('reading.notes'),
            ]);

            HealthLogAlertService::checkCriticalAndNotify($healthLog);
        }

        $completedData = [
            'user_id' => $schedule->user_id,
            'task_type' => 'routine',
            'task_id' => $schedule->id,
            'scheduled_time' => $normalized,
            'completed_at_date' => $date,
        ];
        if ($subTaskKey) {
            $completedData['sub_task_key'] = $subTaskKey;
        }
        CompletedTask::updateOrCreate($completedData);

        TaskMissService::clearMissed($schedule->user_id, 'routine', $schedule->id, $normalized, $subTaskKey);

        \App\Services\CheckInSyncService::syncTaskToCheckIn($schedule->user_id, 'routine', $schedule->id, $date);

        return response()->json([
            'status' => 'success',
            'health_log' => $healthLog,
        ]);
    }

    public function miss(Request $request, RoutineSchedule $schedule)
    {
        if (!$this->canAccessPatient($request->user(), $schedule->user_id)) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $time = $request->validate(['scheduled_time' => 'required'])['scheduled_time'];
        $userTz = $request->timezone ?? $schedule->user->timezone ?? config('app.timezone');
        $normalized = strlen($time) === 5 ? $time . ':00' : $time;
        $minutesPastDue = TaskTimingService::minutesPastDue($normalized, $userTz);

        if (
            !$request->boolean('auto')
            && !TaskTimingService::canMarkMissed(false, false, $minutesPastDue)
        ) {
            return response()->json([
                'error' => 'You can mark a task as missed once its scheduled time has passed.',
                'code' => 'task_not_due',
            ], 403);
        }

        $markedBy = $request->user()->id === $schedule->user_id
            ? 'elderly'
            : ($request->user()->role === 'family' ? 'family' : 'caregiver');

        if ($request->boolean('auto')) {
            $markedBy = 'auto';
        }

        TaskMissService::recordMissed(
            $schedule->user_id,
            'routine',
            $schedule->id,
            $time,
            $request->sub_task_key
                ? "{$schedule->title} — " . VitalReadingService::metricLabel($request->sub_task_key)
                : $schedule->title,
            $markedBy,
            $request->sub_task_key
        );

        return response()->json(['status' => 'missed']);
    }
}
