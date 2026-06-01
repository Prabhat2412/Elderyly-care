<?php

namespace App\Http\Controllers;

use App\Models\MedicalProfile;
use App\Models\User;
use Illuminate\Http\Request;

class MedicalProfileController extends Controller
{
    public function show($userId)
    {
        $profile = MedicalProfile::where('user_id', $userId)->first();
        
        if (!$profile) {
            return response()->json(['message' => 'Profile not found'], 404);
        }

        return response()->json($profile);
    }

    public function update(Request $request, $userId)
    {
        $profile = MedicalProfile::updateOrCreate(
            ['user_id' => $userId],
            $request->all()
        );

        return response()->json($profile);
    }
}
