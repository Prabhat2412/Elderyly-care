<?php

namespace App\Services;

use App\Models\Alert;
use App\Models\MissedTask;
use Carbon\Carbon;

class TaskMissService
{
    public static function recordMissed(
        int $userId,
        string $taskType,
        int $taskId,
        string $scheduledTime,
        string $title,
        string $markedBy = 'elderly'
    ): MissedTask {
        $user = \App\Models\User::findOrFail($userId);
        $userTz = $user->timezone ?? 'UTC';
        $date = Carbon::now($userTz)->toDateString();
        $normalized = strlen($scheduledTime) === 5 ? $scheduledTime . ':00' : $scheduledTime;

        $missed = MissedTask::updateOrCreate(
            [
                'user_id' => $userId,
                'task_type' => $taskType,
                'task_id' => $taskId,
                'scheduled_time' => $normalized,
                'missed_at_date' => $date,
            ],
            ['marked_by' => $markedBy]
        );

        self::createMissedAlerts($userId, $taskType, $title, $date, $markedBy);

        return $missed;
    }

    public static function createMissedAlerts(
        int $userId,
        string $taskType,
        string $title,
        string $date,
        string $markedBy = 'elderly'
    ): void {
        $alertType = $taskType === 'medication' ? 'missed_medication' : 'missed_routine';
        $prefix = $markedBy === 'auto'
            ? 'Auto-missed (30+ min overdue)'
            : 'Missed';

        $message = "{$prefix}: {$title}";

        foreach (['caregiver', 'child'] as $role) {
            $exists = Alert::where('user_id', $userId)
                ->where('type', $alertType)
                ->where('target_role', $role)
                ->where('message', $message)
                ->whereDate('created_at', $date)
                ->exists();

            if (!$exists) {
                Alert::create([
                    'user_id' => $userId,
                    'type' => $alertType,
                    'target_role' => $role,
                    'message' => $message,
                    'resolved' => false,
                ]);
            }
        }
    }

    public static function clearMissed(
        int $userId,
        string $taskType,
        int $taskId,
        string $scheduledTime
    ): void {
        $user = \App\Models\User::find($userId);
        $userTz = $user?->timezone ?? 'UTC';
        $date = Carbon::now($userTz)->toDateString();
        $normalized = strlen($scheduledTime) === 5 ? $scheduledTime . ':00' : $scheduledTime;

        MissedTask::where('user_id', $userId)
            ->where('task_type', $taskType)
            ->where('task_id', $taskId)
            ->where('scheduled_time', $normalized)
            ->where('missed_at_date', $date)
            ->delete();
    }
}
