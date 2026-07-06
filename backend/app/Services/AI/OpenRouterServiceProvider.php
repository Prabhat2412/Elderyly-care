<?php

namespace App\Services\AI;

use App\Contracts\AIProviderInterface;
use Illuminate\Support\Facades\Http;

class OpenRouterServiceProvider implements AIProviderInterface
{
    protected string $apiKey;
    protected string $model;
    protected string $endpoint;
    protected string $provider;

    public function __construct(string $provider = 'nvidia')
    {
        $this->provider = $provider;

        if ($provider === 'groq') {
            $this->apiKey = env('GROQ_API_KEY', '');
            $this->model = env('GROQ_MODEL', 'llama3-8b-8192');
            $this->endpoint = 'https://api.groq.com/openai/v1/chat/completions';
        } elseif ($provider === 'openrouter') {
            $this->apiKey = env('OPENROUTER_API_KEY', '');
            $this->model = env('OPENROUTER_MODEL', 'meta-llama/llama-3.1-8b-instruct:free');
            $this->endpoint = 'https://openrouter.ai/api/v1/chat/completions';
        } elseif ($provider === 'gemini') {
            $this->apiKey = env('GEMINI_API_KEY', '');
            $this->model = env('GEMINI_MODEL', 'gemini-1.5-flash');
            $this->endpoint = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
        } else {
            // Default to NVIDIA
            $this->apiKey = env('NVIDIA_API_KEY', '');
            $this->model = env('NVIDIA_MODEL', 'nvidia/nemotron-3-ultra-550b-a55b');
            $this->endpoint = 'https://integrate.api.nvidia.com/v1/chat/completions';
        }
    }

    public function generateResponse(string $prompt, array $context = []): string
    {
        $messages = [];

        $role = $context['role'] ?? 'elderly';
        $currentUserName = $context['current_user_name'] ?? 'Guest';
        $activePatient = $context['active_patient'] ?? null;
        $patientName = $activePatient ? ($activePatient['name'] ?? 'the patient') : 'the patient';
        $history = $context['history'] ?? [];
        
        $systemContent = "You are CareBuddy, a highly advanced, compassionate, and knowledgeable AI health assistant for ElderCare Connect.\n";
        
        if ($role === 'caregiver') {
            $systemContent .= "You are currently speaking to a CAREGIVER named {$currentUserName}. You must provide professional, actionable, and accurate advice to help them manage their patients.\n";
            $managed = $context['managed_patients'] ?? [];
            if (!empty($managed)) {
                $systemContent .= "Patients managed by {$currentUserName}: " . implode(', ', $managed) . ".\n";
            }
        } elseif ($role === 'family') {
            $systemContent .= "You are currently speaking to a FAMILY MEMBER named {$currentUserName}. Be reassuring, helpful, and keep them informed about {$patientName}'s general care strategies.\n";
            $managed = $context['managed_patients'] ?? [];
            if (!empty($managed)) {
                $systemContent .= "Family members managed: " . implode(', ', $managed) . ".\n";
            }
        } elseif ($role === 'elderly') {
            $systemContent .= "You are currently speaking directly to {$currentUserName} (the patient). Use simple, warm, clear, and encouraging language.\n";
            // For elderly, active patient is themselves.
        } else {
            $systemContent .= "You are currently speaking to a guest named {$currentUserName}.\n";
        }

        if ($activePatient) {
            $systemContent .= "\n--- ACTIVE PATIENT CONTEXT: {$patientName} ---\n";
            if (!empty($activePatient['conditions'])) {
                $systemContent .= "Chronic Conditions: " . implode(', ', $activePatient['conditions']) . "\n";
            }
            if (!empty($activePatient['allergies'])) {
                $systemContent .= "Allergies: " . implode(', ', $activePatient['allergies']) . "\n";
            }
            if (!empty($activePatient['medications'])) {
                $systemContent .= "Prescribed Medications:\n";
                foreach ($activePatient['medications'] as $med) {
                    $freq = isset($med['frequency_data']) ? json_encode($med['frequency_data']) : 'As prescribed';
                    $dose = $med['dosage'] ?? 'Unknown';
                    $systemContent .= "- {$med['name']} (Freq: {$freq}, Dosage: {$dose})\n";
                }
            }
            if (!empty($activePatient['schedules'])) {
                $systemContent .= "Daily Schedules & Activities:\n";
                foreach ($activePatient['schedules'] as $sch) {
                    $time = $sch['scheduled_time'] ?? 'Anytime';
                    $title = $sch['title'] ?? 'Activity';
                    $type = $sch['type'] ?? 'routine';
                    $systemContent .= "- {$time} : {$title} ({$type})\n";
                }
            }
            if (!empty($activePatient['recent_health_logs'])) {
                $systemContent .= "Recent Health Logs / Check-ins (most recent first):\n";
                foreach ($activePatient['recent_health_logs'] as $log) {
                    $date = $log['created_at'] ?? 'Unknown Date';
                    $mood = $log['mood'] ?? 'Unknown';
                    $pain = isset($log['in_pain']) && $log['in_pain'] ? 'Yes' : 'No';
                    $slept = isset($log['slept_well']) && $log['slept_well'] ? 'Yes' : 'No';
                    $notes = $log['notes'] ?? 'None';
                    $systemContent .= "- [{$date}] Mood: {$mood}, In Pain: {$pain}, Slept Well: {$slept}, Note: {$notes}\n";
                }
            }
            $systemContent .= "----------------------------------------\n";
        }

        $systemContent .= "Answer questions clearly and concisely. If asked about the patient's schedule, medications, or vitals, use the context provided above. Do not guess.\n";

        $messages[] = [
            'role' => 'system',
            'content' => $systemContent
        ];

        // Append conversation history
        foreach ($history as $msg) {
            if (isset($msg['sender']) && isset($msg['text'])) {
                $messages[] = [
                    'role' => $msg['sender'] === 'bot' ? 'assistant' : 'user',
                    'content' => $msg['text']
                ];
            }
        }

        $messages[] = [
            'role' => 'user',
            'content' => $prompt
        ];

        // Increase PHP max execution time to avoid 30s timeout
        set_time_limit(120);

        $payload = [
            'model' => $this->model,
            'messages' => $messages,
            'temperature' => 0.7,
            'top_p' => 0.9,
            'max_tokens' => 300,
            'stream' => false,
        ];

        $headers = [
            'Authorization' => 'Bearer ' . $this->apiKey,
            'HTTP-Referer' => config('app.url', 'http://localhost'),
            'X-Title' => 'ElderCare Connect',
        ];

        // Retry up to 3 times with backoff for rate-limited (429) responses
        $maxRetries = 3;
        $lastError = '';

        for ($attempt = 1; $attempt <= $maxRetries; $attempt++) {
            try {
                $response = Http::withOptions(['verify' => false])
                    ->timeout(60)
                    ->withHeaders($headers)
                    ->post($this->endpoint, $payload);

                if ($response->successful()) {
                    $data = $response->json();
                    $content = $data['choices'][0]['message']['content'] ?? null;
                    if ($content) {
                        return trim($content);
                    }
                    return "I'm sorry, I couldn't process that response.";
                }

                $status = $response->status();
                $body = $response->json();
                $errorMsg = $body['error']['message'] ?? $response->body();

                \Log::warning("AI Provider [{$this->provider}] returned {$status} on attempt {$attempt}: {$errorMsg}");

                if ($status === 429) {
                    // Rate limited - wait and retry
                    $retryAfter = $body['error']['metadata']['retry_after_seconds'] ?? ($attempt * 3);
                    $retryAfter = min((int) ceil($retryAfter), 10);
                    sleep($retryAfter);
                    $lastError = "Rate limited (429). Retried {$attempt} time(s).";
                    continue;
                }

                // Non-retryable error
                $lastError = "Error {$status}: {$errorMsg}";
                break;

            } catch (\Exception $e) {
                \Log::error("AI Provider [{$this->provider}] exception on attempt {$attempt}: " . $e->getMessage());
                $lastError = "Connection error: " . $e->getMessage();

                if ($attempt < $maxRetries) {
                    sleep($attempt * 2);
                    continue;
                }
                break;
            }
        }

        return "I'm having trouble connecting right now. {$lastError}";
    }
}
