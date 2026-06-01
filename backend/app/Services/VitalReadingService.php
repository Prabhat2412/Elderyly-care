<?php

namespace App\Services;

use Illuminate\Validation\ValidationException;

class VitalReadingService
{
    public static function normalizeMetricType(?string $metricType): ?string
    {
        if (!$metricType) {
            return null;
        }

        $map = [
            'heart_rate' => 'heartbeat',
            'bp' => 'blood_pressure',
            'blood pressure' => 'blood_pressure',
            'temperature' => 'temp',
        ];

        $key = strtolower(str_replace(' ', '_', trim($metricType)));

        return $map[$key] ?? $key;
    }

    /**
     * Human-readable label for a metric type (used in bundle task titles).
     */
    public static function metricLabel(string $metricType): string
    {
        $labels = [
            'blood_pressure' => 'Blood Pressure',
            'heartbeat' => 'Heart Rate',
            'heart_rate' => 'Heart Rate',
            'temp' => 'Temperature',
            'temperature' => 'Temperature',
            'glucose' => 'Blood Glucose',
            'weight' => 'Weight',
            'oxygen_saturation' => 'Oxygen Saturation',
            'bp' => 'Blood Pressure',
        ];

        $key = strtolower(str_replace(' ', '_', trim($metricType)));
        return $labels[$key] ?? ucwords(str_replace('_', ' ', $key));
    }

    public static function requiresReading(?string $scheduleType, ?string $metricType): bool
    {
        if ($scheduleType === 'vital' || $metricType) {
            return true;
        }

        return false;
    }

    /**
     * @return array{value: array|float|int, unit: string}
     */
    public static function validateAndNormalize(string $metricType, mixed $rawValue): array
    {
        $type = self::normalizeMetricType($metricType);

        return match ($type) {
            'blood_pressure' => self::validateBloodPressure($rawValue),
            'temp' => self::validateScalar($rawValue, 'temp', 32.0, 42.0, '°C'),
            'glucose' => self::validateScalar($rawValue, 'glucose', 20.0, 600.0, 'mg/dL'),
            'heartbeat' => self::validateScalar($rawValue, 'heartbeat', 30, 220, 'BPM'),
            'weight' => self::validateScalar($rawValue, 'weight', 20.0, 300.0, 'kg'),
            'oxygen_saturation' => self::validateScalar($rawValue, 'oxygen_saturation', 50, 100, '%'),
            default => throw ValidationException::withMessages([
                'reading.value' => ["Unsupported vital type: {$metricType}"],
            ]),
        };
    }

    private static function validateBloodPressure(mixed $rawValue): array
    {
        if (!is_array($rawValue)) {
            throw ValidationException::withMessages([
                'reading.value' => ['Blood pressure requires systolic and diastolic values.'],
            ]);
        }

        $systolic = isset($rawValue['systolic']) ? (int) $rawValue['systolic'] : null;
        $diastolic = isset($rawValue['diastolic']) ? (int) $rawValue['diastolic'] : null;

        if ($systolic === null || $diastolic === null) {
            throw ValidationException::withMessages([
                'reading.value' => ['Blood pressure requires systolic and diastolic values.'],
            ]);
        }

        if ($systolic < 70 || $systolic > 250) {
            throw ValidationException::withMessages([
                'reading.value.systolic' => ['Systolic must be between 70 and 250 mmHg.'],
            ]);
        }

        if ($diastolic < 40 || $diastolic > 150) {
            throw ValidationException::withMessages([
                'reading.value.diastolic' => ['Diastolic must be between 40 and 150 mmHg.'],
            ]);
        }

        if ($systolic <= $diastolic) {
            throw ValidationException::withMessages([
                'reading.value' => ['Systolic must be greater than diastolic.'],
            ]);
        }

        return [
            'value' => ['systolic' => $systolic, 'diastolic' => $diastolic],
            'unit' => 'mmHg',
        ];
    }

    private static function validateScalar(
        mixed $rawValue,
        string $type,
        float|int $min,
        float|int $max,
        string $unit
    ): array {
        $numeric = is_array($rawValue)
            ? ($rawValue['value'] ?? null)
            : $rawValue;

        if ($numeric === null || $numeric === '') {
            throw ValidationException::withMessages([
                'reading.value' => ['A numeric reading is required.'],
            ]);
        }

        $value = is_numeric($numeric) ? (float) $numeric : null;

        if ($value === null) {
            throw ValidationException::withMessages([
                'reading.value' => ['A valid number is required.'],
            ]);
        }

        if ($value < $min || $value > $max) {
            throw ValidationException::withMessages([
                'reading.value' => ["{$type} must be between {$min} and {$max}."],
            ]);
        }

        return [
            'value' => $type === 'heartbeat' || $type === 'oxygen_saturation'
                ? (int) round($value)
                : round($value, 1),
            'unit' => $unit,
        ];
    }
}
