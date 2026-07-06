<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\RoutineSchedule;
use App\Models\CompletedTask;
use App\Models\Alert;
use Carbon\Carbon;

class CheckMissedSchedules extends Command
{
    protected $signature = 'app:check-missed-schedules';
    protected $description = 'Check for missed routine schedules and escalate reminders';

    public function handle()
    {
        $this->checkRoutines();
        $this->checkMedications();
    }

    private function checkRoutines()
    {
        $schedules = RoutineSchedule::where('is_active', true)->with('user')->get();
        foreach ($schedules as $schedule) {
            $userTz = $schedule->user->timezone ?? 'UTC';
            $nowTz = Carbon::now($userTz);
            $todayTz = $nowTz->toDateString();

            $times = [];
            if ($schedule->frequency_data && isset($schedule->frequency_data['times'])) {
                $times = $schedule->frequency_data['times'];
            } elseif ($schedule->scheduled_time) {
                $times = [$schedule->scheduled_time];
            } else {
                continue;
            }

            foreach ($times as $time) {
                $formattedTime = strlen($time) === 5 ? $time . ':00' : $time;
                $scheduledTime = Carbon::createFromFormat('H:i:s', $formattedTime, $userTz);
                $diff = $nowTz->diffInMinutes($scheduledTime, false);

                $completed = CompletedTask::where('user_id', $schedule->user_id)
                    ->where('task_type', 'routine')
                    ->where('task_id', $schedule->id)
                    ->where('scheduled_time', $formattedTime)
                    ->where('completed_at_date', $todayTz)
                    ->exists();

                if ($completed) continue;
                $this->processEscalation($schedule->user_id, $schedule->title, $formattedTime, $diff, $todayTz, 'routine');
            }
        }
    }

    private function checkMedications()
    {
        $meds = \App\Models\Medication::where('is_active', true)->with('user')->get();
        foreach ($meds as $med) {
            $freq = $med->frequency_data;
            if (!$freq || !isset($freq['times'])) continue;

            $userTz = $med->user->timezone ?? 'UTC';
            $nowTz = Carbon::now($userTz);
            $todayTz = $nowTz->toDateString();

            foreach ($freq['times'] as $time) {
                $scheduledTime = Carbon::createFromFormat('H:i', $time, $userTz);
                $diff = $nowTz->diffInMinutes($scheduledTime, false);
                
                $completed = CompletedTask::where('user_id', $med->user_id)
                    ->where('task_type', 'medication')
                    ->where('task_id', $med->id)
                    ->where('completed_at_date', $todayTz)
                    ->exists();

                if ($completed) continue;

                $this->processEscalation(
                    $med->user_id, 
                    "Take " . $med->name . " (" . $med->dosage . ")", 
                    $time, 
                    $diff, 
                    $todayTz,
                    'medication'
                );
            }
        }
    }

    private function processEscalation($userId, $title, $time, $diff, $todayTz, $taskType)
    {
        $tiers = [
            ['minutes' => 15, 'role' => 'elderly', 'type' => 'pre_reminder', 'msg' => "Upcoming: $title at $time"],
            ['minutes' => -15, 'role' => 'elderly', 'type' => 'post_reminder', 'msg' => "Missed: Please do $title now."],
            ['minutes' => -30, 'role' => 'family', 'type' => 'family_alert', 'msg' => "Warning: Patient missed $title."],
            ['minutes' => -60, 'role' => 'caregiver', 'type' => "missed_$taskType", 'msg' => "CRITICAL: Patient missed $title by over an hour."]
        ];

        foreach ($tiers as $tier) {
            // Match exactly or past the tier threshold but we only create if it doesn't exist
            if (($tier['minutes'] > 0 && $diff <= $tier['minutes'] && $diff > 0) || 
                ($tier['minutes'] <= 0 && $diff <= $tier['minutes'])) {
                
                $alertExists = Alert::where('user_id', $userId)
                    ->where('type', $tier['type'])
                    ->where('message', 'like', "%{$title}%")
                    ->whereDate('created_at', $todayTz)
                    ->exists();

                if (!$alertExists) {
                    Alert::create([
                        'user_id' => $userId,
                        'type' => $tier['type'],
                        'target_role' => $tier['role'],
                        'message' => $tier['msg'],
                        'resolved' => false
                    ]);
                    $this->info("Escalation created: {$tier['type']} for $title");
                }
            }
        }
    }
}
