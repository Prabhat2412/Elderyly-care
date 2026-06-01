<?php

namespace App\Services;

use App\Models\Alert;
use App\Models\HealthLog;
use App\Models\User;

class HealthLogAlertService
{
    public static function checkCriticalAndNotify(HealthLog $log): void
    {
        $value = $log->value;
        $isCritical = false;
        $alertMsg = '';

        if ($log->type === 'blood_pressure') {
            $systolic = is_array($value) ? (int) ($value['systolic'] ?? 0) : (int) $value;
            if ($systolic > 140 || $systolic < 90) {
                $isCritical = true;
                $alertMsg = "Blood Pressure is {$systolic} mmHg (normal: 90-140).";
            }
        } elseif ($log->type === 'glucose') {
            $glucose = (float) (is_array($value) ? ($value['value'] ?? 0) : $value);
            if ($glucose > 180 || $glucose < 70) {
                $isCritical = true;
                $alertMsg = "Glucose is {$glucose} mg/dL (normal: 70-180).";
            }
        } elseif ($log->type === 'temp') {
            $temp = (float) (is_array($value) ? ($value['value'] ?? 0) : $value);
            if ($temp > 38.0 || $temp < 35.0) {
                $isCritical = true;
                $alertMsg = "Temperature is {$temp}°C (normal: 35.0-38.0).";
            }
        } elseif (in_array($log->type, ['heartbeat', 'heart_rate'], true)) {
            $hr = (int) (is_array($value) ? ($value['value'] ?? 0) : $value);
            if ($hr > 110 || $hr < 55) {
                $isCritical = true;
                $alertMsg = "Heart Rate is {$hr} BPM (normal: 55-110).";
            }
        }

        if (!$isCritical) {
            return;
        }

        $user = User::find($log->user_id);
        $patientName = $user?->name ?? 'Patient';
        $message = "CRITICAL: {$patientName} has out-of-range vitals! {$alertMsg}";

        foreach (['caregiver', 'family'] as $role) {
            Alert::create([
                'user_id' => $log->user_id,
                'type' => 'critical_vitals',
                'message' => $message,
                'resolved' => false,
                'target_role' => $role,
            ]);
        }
    }
}
