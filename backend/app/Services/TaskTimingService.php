<?php

namespace App\Services;

use Carbon\Carbon;

class TaskTimingService
{
    /** Minutes before/after scheduled time when completion is allowed (real-world flexibility). */
    public const SCHEDULE_GRACE_MINUTES = 20;
    public const AUTO_MISS_MINUTES = 30;
    public const ELDERLY_COMPLETE_LIMIT_MINUTES = 120;

    public static function minutesPastDue(string $scheduledTime, string $timezone): int
    {
        $now = Carbon::now($timezone);
        $date = $now->toDateString();
        $normalized = strlen($scheduledTime) === 5 ? $scheduledTime . ':00' : $scheduledTime;
        $taskTime = Carbon::parse("{$date} {$normalized}", $timezone);

        if ($now->lt($taskTime)) {
            return -(int) $now->diffInMinutes($taskTime);
        }

        return (int) $taskTime->diffInMinutes($now);
    }

    public static function isActionWindowOpen(int $minutesPastDue): bool
    {
        return $minutesPastDue >= -self::SCHEDULE_GRACE_MINUTES;
    }

    public static function isWithinGraceWindow(int $minutesPastDue): bool
    {
        return $minutesPastDue >= -self::SCHEDULE_GRACE_MINUTES
            && $minutesPastDue <= self::SCHEDULE_GRACE_MINUTES;
    }

    public static function canMarkComplete(bool $isCompleted, int $minutesPastDue): bool
    {
        if ($isCompleted) {
            return false;
        }

        return self::isActionWindowOpen($minutesPastDue);
    }

    public static function canMarkMissed(bool $isCompleted, bool $isMissed, int $minutesPastDue): bool
    {
        if ($isCompleted || $isMissed) {
            return false;
        }

        return $minutesPastDue >= 0;
    }

    public static function canElderlyComplete(bool $isMissed, bool $isCompleted, int $minutesPastDue): bool
    {
        if ($isCompleted || $isMissed || !self::isActionWindowOpen($minutesPastDue)) {
            return false;
        }

        return $minutesPastDue <= self::SCHEDULE_GRACE_MINUTES;
    }

    public static function shouldAutoMiss(bool $isMissed, bool $isCompleted, int $minutesPastDue): bool
    {
        if ($isCompleted || $isMissed) {
            return false;
        }

        return $minutesPastDue >= self::AUTO_MISS_MINUTES;
    }

    public static function visualStatus(int $minutesPastDue): string
    {
        if ($minutesPastDue < -self::SCHEDULE_GRACE_MINUTES) {
            return 'upcoming';
        }

        if ($minutesPastDue < 0) {
            return 'due-soon';
        }

        if ($minutesPastDue <= self::SCHEDULE_GRACE_MINUTES) {
            return 'in-window';
        }

        if ($minutesPastDue >= self::ELDERLY_COMPLETE_LIMIT_MINUTES) {
            return 'late-blocked';
        }

        if ($minutesPastDue >= self::AUTO_MISS_MINUTES) {
            return 'auto-miss-due';
        }

        return 'overdue';
    }
}
