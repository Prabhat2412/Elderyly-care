<?php

namespace App\Services;

use App\Models\CheckIn;
use Illuminate\Support\Facades\Http;

use App\Contracts\AIProviderInterface;
use Illuminate\Support\Facades\Log;

class AIReportService
{
    protected $aiProvider;

    public function __construct(AIProviderInterface $aiProvider)
    {
        $this->aiProvider = $aiProvider;
    }

    public function generateSummary($userId)
    {
        $checkins = CheckIn::where('user_id', $userId)
            ->where('created_at', '>=', now()->subDays(7))
            ->get();

        $healthLogs = \App\Models\HealthLog::where('user_id', $userId)
            ->where('created_at', '>=', now()->subDays(30))
            ->get();

        if ($checkins->isEmpty() && $healthLogs->isEmpty()) {
            return null;
        }

        // Construct prompt
        $prompt = "Analyze these health records for an elderly person and provide a summary and recommendations.\n";
        $prompt .= "Weekly Check-ins: " . $checkins->toJson() . "\n";
        $prompt .= "30-Day Vitals (BP, Glucose, etc): " . $healthLogs->toJson() . "\n";
        $prompt .= "Provide predictive risk assessment based on any trends (e.g. rising glucose or blood pressure).";
        $prompt .= "\nIMPORTANT: Return ONLY a valid JSON object matching the structure: {\"summary\": \"string describing patient history and trend analysis\", \"recommendations\": [\"array of string recommendations\"], \"concern_level\": \"low|medium|high\"}. Do not wrap in markdown or backticks.";

        try {
            $response = $this->aiProvider->generateResponse($prompt);
            
            // Clean up possible markdown code blocks from the response
            $response = preg_replace('/```json\s*/', '', $response);
            $response = preg_replace('/```\s*/', '', $response);
            
            $data = json_decode(trim($response), true);
            if ($data && isset($data['summary'])) {
                return $data;
            }
        } catch (\Exception $e) {
            Log::error("AI Report generation failed: " . $e->getMessage());
        }

        // Context-aware dynamic mock fallback if Gemini is unavailable
        $missedMeds = $checkins->where('took_meds', false)->count();
        $totalCheckins = $checkins->count();
        
        $bpLogs = $healthLogs->where('type', 'blood_pressure');
        $highBpCount = 0;
        foreach ($bpLogs as $log) {
            $val = $log->value;
            $sys = is_array($val) ? ($val['systolic'] ?? null) : (is_numeric($val) ? $val : null);
            if ($sys && $sys > 140) {
                $highBpCount++;
            }
        }

        $glucoseLogs = $healthLogs->where('type', 'glucose');
        $highGlucoseCount = 0;
        foreach ($glucoseLogs as $log) {
            $val = $log->value;
            $gVal = is_array($val) ? ($val['value'] ?? 0) : $val;
            if ($gVal > 180) {
                $highGlucoseCount++;
            }
        }

        $concern = 'low';
        $summary = "The patient has been doing relatively well over the past 7 days.";
        $recs = ["Encourage daily physical activity and hydration."];

        if ($totalCheckins > 0 && $missedMeds > 0) {
            $summary .= " However, they missed taking their medication {$missedMeds} out of {$totalCheckins} times recorded.";
            $recs[] = "Review medication schedule and verify pillbox alignment.";
            $concern = 'medium';
        } else if ($totalCheckins > 0) {
            $summary .= " They have been highly consistent with their medication routine.";
        }

        if ($highBpCount > 0) {
            $summary .= " We noted {$highBpCount} instances of elevated blood pressure.";
            $recs[] = "Monitor blood pressure twice daily and limit sodium intake.";
            $concern = ($concern === 'medium' || $highBpCount > 2) ? 'high' : 'medium';
        }

        if ($highGlucoseCount > 0) {
            $summary .= " There were {$highGlucoseCount} instances of elevated blood glucose levels.";
            $recs[] = "Check fasting glucose and consult dietary preferences.";
            $concern = 'high';
        }

        return [
            'summary' => $summary,
            'recommendations' => $recs,
            'concern_level' => $concern
        ];
    }
}
