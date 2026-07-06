<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use App\Services\AI\OpenRouterServiceProvider;

class ChatbotController extends Controller
{
    public function chat(Request $request, User $patient)
    {
        $request->validate([
            'message' => 'required|string',
            'history' => 'nullable|array',
            'provider' => 'nullable|string'
        ]);

        $userMessage = $request->input('message');
        $history = $request->input('history', []);
        $provider = $request->input('provider', 'nvidia');

        $profile = $patient->medicalProfile;
        $meds = $patient->medications;
        
        $conditions = $profile ? ($profile->chronic_conditions ?? []) : [];
        $allergies = $profile ? ($profile->allergies ?? []) : [];

        $currentUser = $request->user();
        $role = $currentUser ? $currentUser->role : 'elderly';
        $currentUserName = $currentUser ? $currentUser->name : 'Guest';
        $currentUserEmail = $currentUser ? $currentUser->email : '';

        // Get schedules and recent checkins for the active patient
        $schedules = \App\Models\RoutineSchedule::where('user_id', $patient->id)->where('is_active', true)->get()->toArray();
        $healthLogs = $patient->checkins()->latest()->take(5)->get()->toArray();

        // If the current user is a caregiver or family, get the list of ALL patients they manage
        $managedPatients = [];
        if ($currentUser && in_array($role, ['caregiver', 'family'])) {
            $managedPatients = $currentUser->patients()->pluck('name')->toArray();
        }

        $context = [
            'current_user_name' => $currentUserName,
            'current_user_email' => $currentUserEmail,
            'role' => $role,
            'managed_patients' => $managedPatients,
            'active_patient' => [
                'name' => $patient->name,
                'conditions' => $conditions,
                'allergies' => $allergies,
                'medications' => $meds->toArray(),
                'schedules' => $schedules,
                'recent_health_logs' => $healthLogs
            ],
            'history' => $history
        ];

        $aiService = new OpenRouterServiceProvider($provider);
        
        $reply = $aiService->generateResponse($userMessage, $context);

        if (str_starts_with($reply, "I'm having trouble connecting") || str_starts_with($reply, "Connection error")) {
            // Fall back silently
            $reply = "I'm here to support you! Let me know if you need help with your medications, exercise ideas, or just want to chat.";
            $lowerMsg = strtolower($userMessage);
            $currentUser = $request->user();
            $role = $currentUser ? $currentUser->role : 'elderly';

            $healthKeywords = ['med', 'pill', 'tablet', 'health', 'doctor', 'pain', 'hurt', 'sick', 'fever', 'blood', 'pressure', 'heart', 'sugar', 'diet', 'food', 'symptom', 'disease'];
            $isHealthRelated = false;
            foreach ($healthKeywords as $keyword) {
                if (str_contains($lowerMsg, $keyword)) {
                    $isHealthRelated = true;
                    break;
                }
            }

            if ($isHealthRelated) {
                if ($role === 'caregiver') {
                    $reply = "As a caregiver, monitoring medications and symptoms is crucial. Please review the patient's schedule and consult a doctor if new symptoms appear or persist.";
                } else {
                    $medNames = $meds->pluck('name')->toArray();
                    if (!empty($medNames)) {
                        $reply = "According to your care plan, your medications include: " . implode(', ', $medNames) . ". Please take them as prescribed and let your caregiver know if you feel unwell.";
                    } else {
                        $reply = "Your health is very important! Remember to take your prescribed medications on time and consult a doctor if you have health concerns.";
                    }
                }
            } elseif (str_contains($lowerMsg, 'help')) {
                if ($role === 'caregiver') {
                    $reply = "I can help you manage your patient's medications, monitor their vitals, or schedule activities. What do you need assistance with?";
                } else {
                    $reply = "I can remind you of your medications, suggest gentle exercises, or just chat with you. How can I help today?";
                }
            } elseif (str_contains($lowerMsg, 'water') || str_contains($lowerMsg, 'drink') || str_contains($lowerMsg, 'thirsty')) {
                $reply = "Staying hydrated is extremely important for your energy and health! Try drinking a fresh glass of water right now.";
            } elseif (str_contains($lowerMsg, 'walk') || str_contains($lowerMsg, 'exercise') || str_contains($lowerMsg, 'move')) {
                $reply = "Movement keeps our joints and mind healthy! A short, gentle walk around the house or garden is a wonderful idea, provided you feel steady on your feet.";
            } elseif (str_contains($lowerMsg, 'hello') || str_contains($lowerMsg, 'hi') || str_contains($lowerMsg, 'hey')) {
                $reply = "Hello there! I hope you're having a comfortable day. How can I help you today?";
            } elseif (str_contains($lowerMsg, 'sad') || str_contains($lowerMsg, 'lonely') || str_contains($lowerMsg, 'depressed')) {
                $reply = "I'm here for you, and you are doing a wonderful job. Remember that your caretakers and family care deeply about you. Let's chat about something pleasant, or take a deep, relaxing breath together.";
            } else {
                $reply = "I hear you! I'm equipped to discuss any health, medicine, or wellness topics. Let me know what's on your mind!";
            }
        }

        return response()->json([
            'reply' => trim($reply),
            'sender' => 'bot'
        ]);
    }
}

