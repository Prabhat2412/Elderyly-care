<?php

namespace App\Http\Controllers;

use App\Models\CheckIn;
use Illuminate\Http\Request;

class CheckInController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'user_id' => 'required',
            'ate' => 'nullable|boolean',
            'took_meds' => 'nullable|boolean',
            'drank_water' => 'nullable|boolean',
            'slept_well' => 'nullable|boolean',
            'moved_around' => 'nullable|boolean',
            'in_pain' => 'nullable|boolean',
            'mood' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        $validated = array_merge([
            'ate' => false,
            'took_meds' => false,
            'drank_water' => false,
            'slept_well' => false,
            'moved_around' => false,
            'in_pain' => false,
            'mood' => 'Neutral'
        ], $validated);

        $userId = $validated['user_id'];
        $user = \App\Models\User::find($userId);
        $userTz = $user->timezone ?? 'UTC';
        
        $startOfDayUtc = \Carbon\Carbon::now($userTz)->startOfDay()->setTimezone('UTC');
        $endOfDayUtc = \Carbon\Carbon::now($userTz)->endOfDay()->setTimezone('UTC');

        $checkin = CheckIn::where('user_id', $userId)
            ->whereBetween('created_at', [$startOfDayUtc, $endOfDayUtc])
            ->first();

        if ($checkin) {
            $checkin->update($validated);
        } else {
            $checkin = CheckIn::create($validated);
        }

        // Synchronize this check-in to today's tasks
        \App\Services\CheckInSyncService::syncCheckInToTasks($checkin);

        return response()->json($checkin, 201);
    }
}
