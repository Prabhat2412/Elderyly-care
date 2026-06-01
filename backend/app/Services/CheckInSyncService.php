<?php

namespace App\Services;

use App\Models\User;
use App\Models\CheckIn;
use App\Models\Medication;
use App\Models\RoutineSchedule;
use App\Models\CompletedTask;
use Carbon\Carbon;

class CheckInSyncService
{
    /**
     * When a check-in is saved, complete corresponding tasks for today.
     */
    public static function syncCheckInToTasks(CheckIn $checkin)
    {
        $user = User::find($checkin->user_id);
        $userTz = $user->timezone ?? 'UTC';
        $today = Carbon::now($userTz)->toDateString();
        $dayOfWeek = strtolower(Carbon::now($userTz)->format('l'));

        // 1. Sync Medications
        if ($checkin->took_meds) {
            $meds = Medication::where('user_id', $user->id)
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

                    CompletedTask::firstOrCreate([
                        'user_id' => $user->id,
                        'task_type' => 'medication',
                        'task_id' => $med->id,
                        'scheduled_time' => $formattedTime,
                        'completed_at_date' => $today
                    ]);
                }
            }
        }

        // Helper map for routine types
        $routineSyncMap = [
            'ate' => 'meal',
            'drank_water' => 'hydration',
            'moved_around' => 'activity'
        ];

        foreach ($routineSyncMap as $checkInField => $routineType) {
            if ($checkin->$checkInField) {
                $schedules = RoutineSchedule::where('user_id', $user->id)
                    ->where('type', $routineType)
                    ->where('is_active', true)
                    ->get();

                foreach ($schedules as $s) {
                    $times = [];
                    if ($s->frequency_data) {
                        $freq = $s->frequency_data;
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

                        CompletedTask::firstOrCreate([
                            'user_id' => $user->id,
                            'task_type' => 'routine',
                            'task_id' => $s->id,
                            'scheduled_time' => $formattedTime,
                            'completed_at_date' => $today
                        ]);
                    }
                }
            }
        }
    }

    /**
     * When a task or medication is completed, update the daily check-in.
     */
    public static function syncTaskToCheckIn($userId, $taskType, $taskId, $date)
    {
        $updateFields = [];

        if ($taskType === 'medication') {
            $updateFields['took_meds'] = true;
        } elseif ($taskType === 'routine') {
            $schedule = RoutineSchedule::find($taskId);
            if ($schedule) {
                if ($schedule->type === 'meal') {
                    $updateFields['ate'] = true;
                } elseif ($schedule->type === 'hydration') {
                    $updateFields['drank_water'] = true;
                } elseif ($schedule->type === 'activity') {
                    $updateFields['moved_around'] = true;
                }
            }
        }

        if (empty($updateFields)) {
            return;
        }

        // Find or create check-in for today (created_at matches the date)
        $checkin = CheckIn::where('user_id', $userId)
            ->whereDate('created_at', $date)
            ->first();

        if ($checkin) {
            $checkin->update($updateFields);
        } else {
            CheckIn::create(array_merge([
                'user_id' => $userId,
                'ate' => false,
                'took_meds' => false,
                'drank_water' => false,
                'slept_well' => true, // default positive
                'moved_around' => false,
                'in_pain' => false,
                'mood' => 'Neutral',
                'notes' => 'Auto-generated from task completion.'
            ], $updateFields));
        }
    }
}
