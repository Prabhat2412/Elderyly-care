<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class ChatbotController extends Controller
{
    public function chat(Request $request, User $patient)
    {
        $request->validate([
            'message' => 'required|string',
            'history' => 'nullable|array'
        ]);

        $userMessage = $request->input('message');
        $history = $request->input('history', []);

        // Load patient details to provide context
        $profile = $patient->medicalProfile;
        $meds = $patient->medications;
        
        $medNames = $meds->pluck('name')->toArray();
        $conditions = $profile->chronic_conditions ?? [];

        $apiKey = env('GEMINI_API_KEY');
        if ($apiKey && $apiKey !== 'placeholder') {
            try {
                // Construct prompt with patient context
                $context = "You are a warm, friendly, and encouraging AI Care Companion chatbot named 'CareBuddy' talking to {$patient->name}, an elderly patient.\n";
                if (!empty($conditions)) {
                    $context .= "They have the following conditions: " . implode(', ', $conditions) . ".\n";
                }
                if (!empty($medNames)) {
                    $context .= "They take these medications: " . implode(', ', $medNames) . ".\n";
                }
                $context .= "Keep your response concise (2-4 sentences), highly supportive, easy to read, and gentle. Avoid giving deep medical prescriptions; instead advise them to check with their doctor or caregiver for serious issues.\n\n";

                // Format history for Gemini API
                $contents = [];
                foreach ($history as $msg) {
                    $role = ($msg['sender'] === 'user' || $msg['sender'] === 'patient') ? 'user' : 'model';
                    $contents[] = [
                        'role' => $role,
                        'parts' => [
                            ['text' => $msg['text']]
                        ]
                    ];
                }

                // Add current message
                $contents[] = [
                    'role' => 'user',
                    'parts' => [
                        ['text' => $context . "User: " . $userMessage]
                    ]
                ];

                $response = Http::withHeaders([
                    'Content-Type' => 'application/json',
                ])->post("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={$apiKey}", [
                    'contents' => $contents
                ]);

                if ($response->successful()) {
                    $json = $response->json();
                    $reply = $json['candidates'][0]['content']['parts'][0]['text'] ?? '';
                    if (!empty(trim($reply))) {
                        return response()->json([
                            'reply' => trim($reply),
                            'sender' => 'bot'
                        ]);
                    }
                }
            } catch (\Exception $e) {
                // Fall back silently
            }
        }

        // Smart context-aware mock fallback if Gemini is unavailable
        $reply = "I'm here to support you! Let me know if you need help with your medications, exercise ideas, or just want to chat.";
        $lowerMsg = strtolower($userMessage);

        if (str_contains($lowerMsg, 'pain') || str_contains($lowerMsg, 'hurt')) {
            $reply = "I'm sorry to hear you're feeling pain. Please take it easy, rest, and make sure to notify your caregiver or doctor if it persists or gets worse.";
        } elseif (str_contains($lowerMsg, 'med') || str_contains($lowerMsg, 'pill') || str_contains($lowerMsg, 'tablet')) {
            if (!empty($medNames)) {
                $reply = "According to your care plan, your medications include: " . implode(', ', $medNames) . ". Be sure to log them when you take them!";
            } else {
                $reply = "Always remember to take your medications on time as instructed by your caregiver. Let me know if you have questions!";
            }
        } elseif (str_contains($lowerMsg, 'water') || str_contains($lowerMsg, 'drink') || str_contains($lowerMsg, 'thirsty')) {
            $reply = "Staying hydrated is extremely important for your energy and health! Try drinking a fresh glass of water right now.";
        } elseif (str_contains($lowerMsg, 'walk') || str_contains($lowerMsg, 'exercise') || str_contains($lowerMsg, 'move')) {
            $reply = "Movement keeps our joints and mind healthy! A short, gentle walk around the house or garden is a wonderful idea, provided you feel steady on your feet.";
        } elseif (str_contains($lowerMsg, 'hello') || str_contains($lowerMsg, 'hi') || str_contains($lowerMsg, 'hey')) {
            $reply = "Hello there, {$patient->name}! I hope you're having a comfortable day. How can I help you today?";
        } elseif (str_contains($lowerMsg, 'sad') || str_contains($lowerMsg, 'lonely') || str_contains($lowerMsg, 'depressed')) {
            $reply = "I'm here for you, and you are doing a wonderful job. Remember that your caretakers and family care deeply about you. Let's chat about something pleasant, or take a deep, relaxing breath together.";
        }

        return response()->json([
            'reply' => $reply,
            'sender' => 'bot'
        ]);
    }
}
