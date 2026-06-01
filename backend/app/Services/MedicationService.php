<?php

namespace App\Services;

use App\Models\Medication;
use App\Models\User;
use Carbon\Carbon;

class MedicationService
{
    public function getNextDose(Medication $medication, ?string $timezone = null): ?Carbon
    {
        $freq = $medication->frequency_data;
        if (!$freq || !isset($freq['times']) || count($freq['times']) === 0) {
            return null;
        }

        $tz = $timezone ?? $medication->user?->timezone ?? config('app.timezone');
        $now = Carbon::now($tz);
        $nextDoses = [];

        foreach ($freq['times'] as $time) {
            $timeStr = strlen($time) <= 5 ? $time : substr($time, 0, 5);
            $doseTime = Carbon::parse($now->toDateString() . ' ' . $timeStr, $tz);

            if ($doseTime->lte($now)) {
                $doseTime->addDay();
            }

            if (isset($freq['type']) && $freq['type'] === 'weekly') {
                $days = array_map('strtolower', $freq['days'] ?? []);
                if (count($days) === 0) {
                    continue;
                }
                $attempts = 0;
                while (!in_array(strtolower($doseTime->format('l')), $days, true) && $attempts < 8) {
                    $doseTime->addDay();
                    $attempts++;
                }
            }

            $nextDoses[] = $doseTime;
        }

        if (count($nextDoses) === 0) {
            return null;
        }

        usort($nextDoses, fn ($a, $b) => $a->timestamp <=> $b->timestamp);

        return $nextDoses[0];
    }

    public function getPatientSchedule(int $userId)
    {
        $user = User::find($userId);
        $tz = $user?->timezone ?? config('app.timezone');

        $meds = Medication::where('user_id', $userId)
            ->where('is_active', true)
            ->with('user')
            ->get();

        return $meds->map(function ($med) use ($tz) {
            $next = $this->getNextDose($med, $tz);
            $med->next_dose = $next ? $next->toIso8601String() : null;
            $med->next_dose_time = $next ? $next->format('H:i') : null;
            return $med;
        });
    }
}
