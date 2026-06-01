<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\AuthorizesPatientAccess;
use App\Models\HealthLog;
use App\Services\HealthLogAlertService;
use App\Services\VitalReadingService;
use Illuminate\Http\Request;

class HealthLogController extends Controller
{
    use AuthorizesPatientAccess;

    public function index(Request $request)
    {
        $userId = $request->query('user_id') ?? $request->user()->id;

        if (!$this->canAccessPatient($request->user(), (int) $userId)) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $logs = HealthLog::where('user_id', $userId)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($logs);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'type' => 'required|string',
            'value' => 'required',
            'unit' => 'nullable|string',
            'notes' => 'nullable|string|max:500',
            'source_task_type' => 'nullable|string',
            'source_task_id' => 'nullable|integer',
            'scheduled_time' => 'nullable',
            'logged_date' => 'nullable|date',
        ]);

        if (!$this->canAccessPatient($request->user(), (int) $validated['user_id'])) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $metricType = VitalReadingService::normalizeMetricType($validated['type']);
        $normalized = VitalReadingService::validateAndNormalize($metricType, $validated['value']);

        $log = HealthLog::create([
            'user_id' => $validated['user_id'],
            'source_task_type' => $validated['source_task_type'] ?? null,
            'source_task_id' => $validated['source_task_id'] ?? null,
            'scheduled_time' => $validated['scheduled_time'] ?? null,
            'logged_date' => $validated['logged_date'] ?? now()->toDateString(),
            'recorded_by' => $request->user()->id,
            'type' => $metricType,
            'value' => $normalized['value'],
            'unit' => $normalized['unit'] ?: ($validated['unit'] ?? null),
            'notes' => $validated['notes'] ?? null,
        ]);

        HealthLogAlertService::checkCriticalAndNotify($log);

        return response()->json($log, 201);
    }
}
