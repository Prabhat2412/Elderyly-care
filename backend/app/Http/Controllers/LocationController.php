<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class LocationController extends Controller
{
    /**
     * Store the latest GPS location for the authenticated elderly user.
     */
    public function store(Request $request)
    {
        $request->validate([
            'latitude'  => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
            'timestamp' => 'nullable|string',
        ]);

        $user = Auth::user();

        // Upsert: one location row per user (update if exists, insert if not)
        DB::table('user_locations')->upsert(
            [
                'user_id'    => $user->id,
                'latitude'   => $request->latitude,
                'longitude'  => $request->longitude,
                'recorded_at' => $request->timestamp ?? now(),
                'updated_at' => now(),
            ],
            ['user_id'],           // conflict columns
            ['latitude', 'longitude', 'recorded_at', 'updated_at']  // update columns
        );

        return response()->json(['status' => 'ok']);
    }

    /**
     * Retrieve the latest GPS location for a given user (for caregivers/family).
     */
    public function show($userId)
    {
        $location = DB::table('user_locations')
            ->where('user_id', $userId)
            ->first();

        if (!$location) {
            return response()->json(['error' => 'No location data found'], 404);
        }

        return response()->json($location);
    }
}
