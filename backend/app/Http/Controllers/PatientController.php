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
}
