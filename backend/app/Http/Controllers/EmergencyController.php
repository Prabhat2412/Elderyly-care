<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class EmergencyController extends Controller
{
    public function trigger(Request $request)
    {
        $user = User::find($request->user_id);
        
        // In a real app, this would send SMS/Push notifications
        Log::emergency("EMERGENCY SIGNAL FROM: " . ($user->name ?? 'Unknown User'));
        
        // Create an alert record for the caregiver
        \App\Models\Alert::create([
            'user_id' => $user->id,
            'type' => 'emergency',
            'message' => 'EMERGENCY: ' . $user->name . ' has requested help!',
            'resolved' => false,
            'target_role' => 'caregiver'
        ]);
        
        // Create an alert record for the child (family member)
        \App\Models\Alert::create([
            'user_id' => $user->id,
            'type' => 'emergency',
            'message' => 'EMERGENCY: ' . $user->name . ' has requested help!',
            'resolved' => false,
            'target_role' => 'child'
        ]);
        
        return response()->json([
            'status' => 'success',
            'message' => 'Emergency alerts sent to caregiver and family members.'
        ]);
    }
}
