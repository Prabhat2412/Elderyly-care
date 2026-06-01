<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Medication;
use App\Models\MedicalProfile;
use App\Models\CompletedTask;
use App\Models\MissedTask;
use App\Models\HealthLog;
use App\Models\CheckIn;
use App\Models\Alert;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Create Caretaker
        $caretaker = User::create([
            'name' => 'Sarah Caretaker',
            'email' => 'sarah@example.com',
            'password' => Hash::make('password'),
            'role' => 'caregiver',
        ]);

        // 2. Create Elderly Patients
        $grandpa = User::create([
            'name' => 'Grandpa Joe',
            'email' => 'joe@example.com',
            'password' => Hash::make('password'),
            'role' => 'elderly',
        ]);

        $grandma = User::create([
            'name' => 'Grandma Mary',
            'email' => 'mary@example.com',
            'password' => Hash::make('password'),
            'role' => 'elderly',
        ]);

        // Edge case: Patient with no medical profile and no medications
        $uncle = User::create([
            'name' => 'Uncle Bob',
            'email' => 'bob@example.com',
            'password' => Hash::make('password'),
            'role' => 'elderly',
        ]);
        
        // 3. Create Family Members
        $daughter = User::create([
            'name' => 'Anna Daughter',
            'email' => 'anna@example.com',
            'password' => Hash::make('password'),
            'role' => 'family',
        ]);

        $son = User::create([
            'name' => 'Mark Son',
            'email' => 'mark@example.com',
            'password' => Hash::make('password'),
            'role' => 'family',
        ]);

        // 4. Establish Relationships
        DB::table('user_relationships')->insert([
            // Caretaker links
            ['user_id' => $grandpa->id, 'relative_id' => $caretaker->id, 'relation_type' => 'caretaker'],
            ['user_id' => $grandma->id, 'relative_id' => $caretaker->id, 'relation_type' => 'caretaker'],
            ['user_id' => $uncle->id, 'relative_id' => $caretaker->id, 'relation_type' => 'caretaker'],
            
            // Family links (multiple family members for grandpa)
            ['user_id' => $grandpa->id, 'relative_id' => $daughter->id, 'relation_type' => 'family'],
            ['user_id' => $grandpa->id, 'relative_id' => $son->id, 'relation_type' => 'family'],
            
            // Family link for uncle
            ['user_id' => $uncle->id, 'relative_id' => $son->id, 'relation_type' => 'family'],
        ]);

        // 5. Create Medical Profiles (Uncle intentionally skipped)
        MedicalProfile::create([
            'user_id' => $grandpa->id,
            'chronic_conditions' => ['Type 2 Diabetes', 'Hypertension'],
            'allergies' => ['Penicillin'],
            'blood_type' => 'A+',
            'cognitive_status' => 'Stable',
            'fall_risk' => 'Moderate',
        ]);

        MedicalProfile::create([
            'user_id' => $grandma->id,
            'chronic_conditions' => ['Early Stage Dementia'],
            'allergies' => ['Peanuts'],
            'blood_type' => 'O-',
            'cognitive_status' => 'Declining',
            'fall_risk' => 'High',
        ]);

        // 6. Create Complex Medication Routines
        // Grandpa Joe: Metformin 2x daily, Lisinopril 1x morning
        $med1 = Medication::create([
            'user_id' => $grandpa->id,
            'name' => 'Metformin',
            'dosage' => '500mg',
            'instructions' => 'Take with meals',
            'frequency_data' => ['type' => 'daily', 'times' => ['08:00', '20:00']],
            'start_date' => now()->subMonths(2),
            'is_active' => true,
        ]);

        $med2 = Medication::create([
            'user_id' => $grandpa->id,
            'name' => 'Lisinopril',
            'dosage' => '10mg',
            'instructions' => 'Morning dose',
            'frequency_data' => ['type' => 'daily', 'times' => ['08:00']],
            'start_date' => now()->subMonths(1),
            'is_active' => true,
        ]);

        // Grandma Mary: Donepezil 1x night, Vitamin D weekly Mon
        $med3 = Medication::create([
            'user_id' => $grandma->id,
            'name' => 'Donepezil',
            'dosage' => '5mg',
            'instructions' => 'Before bed',
            'frequency_data' => ['type' => 'daily', 'times' => ['22:00']],
            'start_date' => now()->subMonths(3),
            'is_active' => true,
        ]);

        // 7. Create Routine Schedules
        $routine1 = \App\Models\RoutineSchedule::create([
            'user_id' => $grandpa->id,
            'title' => 'Breakfast',
            'type' => 'meal',
            'scheduled_time' => '08:00:00'
        ]);

        $routine2 = \App\Models\RoutineSchedule::create([
            'user_id' => $grandpa->id,
            'title' => 'Evening Walk',
            'type' => 'activity',
            'scheduled_time' => '17:00:00'
        ]);

        $vital1 = \App\Models\RoutineSchedule::create([
            'user_id' => $grandpa->id,
            'title' => 'Blood Pressure Check',
            'type' => 'vital',
            'metric_type' => 'blood_pressure',
            'frequency_data' => ['type' => 'daily', 'times' => ['08:30', '19:00']]
        ]);

        // 8. Create historical missed and completed tasks for stats
        $yesterday = Carbon::yesterday();
        $twoDaysAgo = Carbon::now()->subDays(2);
        $threeDaysAgo = Carbon::now()->subDays(3);
        $fourDaysAgo = Carbon::now()->subDays(4);
        $fiveDaysAgo = Carbon::now()->subDays(5);
        
        // === DAY -5: Five days ago ===
        CompletedTask::create([
            'user_id' => $grandpa->id,
            'task_type' => 'medication',
            'task_id' => $med1->id,
            'sub_task_key' => '08:00',
            'scheduled_time' => '08:00:00',
            'completed_at_date' => $fiveDaysAgo->toDateString(),
        ]);
        CompletedTask::create([
            'user_id' => $grandpa->id,
            'task_type' => 'routine',
            'task_id' => $routine1->id,
            'scheduled_time' => '08:00:00',
            'completed_at_date' => $fiveDaysAgo->toDateString(),
        ]);
        HealthLog::create([
            'user_id' => $grandpa->id,
            'type' => 'blood_pressure',
            'value' => json_encode(['systolic' => 118, 'diastolic' => 78]),
            'notes' => 'Morning reading - all normal',
            'recorded_by' => $caretaker->id,
            'logged_date' => $fiveDaysAgo->toDateString(),
            'created_at' => $fiveDaysAgo->copy()->setTime(8, 15),
        ]);

        // === DAY -4: Four days ago ===
        CompletedTask::create([
            'user_id' => $grandpa->id,
            'task_type' => 'medication',
            'task_id' => $med1->id,
            'sub_task_key' => '08:00',
            'scheduled_time' => '08:00:00',
            'completed_at_date' => $fourDaysAgo->toDateString(),
        ]);
        MissedTask::create([
            'user_id' => $grandpa->id,
            'task_type' => 'medication',
            'task_id' => $med1->id,
            'sub_task_key' => '20:00',
            'scheduled_time' => '20:00:00',
            'marked_by' => 'auto',
            'missed_at_date' => $fourDaysAgo->toDateString(),
        ]);
        HealthLog::create([
            'user_id' => $grandpa->id,
            'type' => 'blood_pressure',
            'value' => json_encode(['systolic' => 142, 'diastolic' => 92]),
            'notes' => 'Elevated - patient was anxious about appointment',
            'recorded_by' => $caretaker->id,
            'logged_date' => $fourDaysAgo->toDateString(),
            'created_at' => $fourDaysAgo->copy()->setTime(9, 0),
        ]);
        Alert::create([
            'user_id' => $grandpa->id,
            'type' => 'high_blood_pressure',
            'message' => 'Blood pressure reading above threshold (142/92).',
            'target_role' => 'caregiver',
            'resolved' => true,
            'created_at' => $fourDaysAgo->copy()->setTime(9, 5),
        ]);

        // === DAY -3: Three days ago ===
        CompletedTask::create([
            'user_id' => $grandpa->id,
            'task_type' => 'medication',
            'task_id' => $med1->id,
            'sub_task_key' => '08:00',
            'scheduled_time' => '08:00:00',
            'completed_at_date' => $threeDaysAgo->toDateString(),
        ]);
        CompletedTask::create([
            'user_id' => $grandpa->id,
            'task_type' => 'medication',
            'task_id' => $med1->id,
            'sub_task_key' => '20:00',
            'scheduled_time' => '20:00:00',
            'completed_at_date' => $threeDaysAgo->toDateString(),
        ]);
        CompletedTask::create([
            'user_id' => $grandpa->id,
            'task_type' => 'routine',
            'task_id' => $routine1->id,
            'scheduled_time' => '08:00:00',
            'completed_at_date' => $threeDaysAgo->toDateString(),
        ]);
        HealthLog::create([
            'user_id' => $grandpa->id,
            'type' => 'blood_pressure',
            'value' => json_encode(['systolic' => 125, 'diastolic' => 82]),
            'notes' => 'Back to normal range',
            'recorded_by' => $grandpa->id,
            'logged_date' => $threeDaysAgo->toDateString(),
            'created_at' => $threeDaysAgo->copy()->setTime(7, 45),
        ]);
        HealthLog::create([
            'user_id' => $grandpa->id,
            'type' => 'heartbeat',
            'value' => json_encode(['reading' => 68]),
            'notes' => 'Resting heart rate after nap',
            'recorded_by' => $caretaker->id,
            'logged_date' => $threeDaysAgo->toDateString(),
            'created_at' => $threeDaysAgo->copy()->setTime(15, 30),
        ]);

        // === DAY -2: Two days ago ===
        CompletedTask::create([
            'user_id' => $grandpa->id,
            'task_type' => 'medication',
            'task_id' => $med1->id,
            'sub_task_key' => '08:00',
            'scheduled_time' => '08:00:00',
            'completed_at_date' => $twoDaysAgo->toDateString(),
        ]);
        CompletedTask::create([
            'user_id' => $grandpa->id,
            'task_type' => 'routine',
            'task_id' => $routine1->id,
            'scheduled_time' => '08:00:00',
            'completed_at_date' => $twoDaysAgo->toDateString(),
        ]);
        MissedTask::create([
            'user_id' => $grandpa->id,
            'task_type' => 'routine',
            'task_id' => $routine2->id,
            'scheduled_time' => '12:00:00',
            'marked_by' => 'elderly',
            'missed_at_date' => $twoDaysAgo->toDateString(),
        ]);
        HealthLog::create([
            'user_id' => $grandpa->id,
            'type' => 'blood_pressure',
            'value' => json_encode(['systolic' => 130, 'diastolic' => 84]),
            'notes' => 'Slightly elevated after exercise',
            'recorded_by' => $grandpa->id,
            'logged_date' => $twoDaysAgo->toDateString(),
            'created_at' => $twoDaysAgo->copy()->setTime(10, 0),
        ]);
        Alert::create([
            'user_id' => $grandpa->id,
            'type' => 'missed_routine',
            'message' => 'Missed Lunch routine at 12:00. Patient reported not feeling hungry.',
            'target_role' => 'family',
            'resolved' => true,
            'created_at' => $twoDaysAgo->copy()->setTime(12, 35),
        ]);

        // === DAY -1: Yesterday ===
        CompletedTask::create([
            'user_id' => $grandpa->id,
            'task_type' => 'medication',
            'task_id' => $med1->id,
            'sub_task_key' => '08:00',
            'scheduled_time' => '08:00:00',
            'completed_at_date' => $yesterday->toDateString(),
        ]);
        CompletedTask::create([
            'user_id' => $grandpa->id,
            'task_type' => 'routine',
            'task_id' => $routine1->id,
            'scheduled_time' => '08:00:00',
            'completed_at_date' => $yesterday->toDateString(),
        ]);
        MissedTask::create([
            'user_id' => $grandpa->id,
            'task_type' => 'medication',
            'task_id' => $med1->id,
            'sub_task_key' => '20:00',
            'scheduled_time' => '20:00:00',
            'marked_by' => 'auto',
            'missed_at_date' => $yesterday->toDateString(),
        ]);

        // 9. Seed Health Logs (vitals)
        HealthLog::create([
            'user_id' => $grandpa->id,
            'type' => 'blood_pressure',
            'value' => json_encode(['systolic' => 120, 'diastolic' => 80]),
            'notes' => 'Feeling good',
            'recorded_by' => $caretaker->id,
            'logged_date' => $yesterday->toDateString(),
            'created_at' => $yesterday->copy()->setTime(8, 30),
        ]);

        HealthLog::create([
            'user_id' => $grandpa->id,
            'type' => 'blood_pressure',
            'value' => json_encode(['systolic' => 135, 'diastolic' => 85]),
            'notes' => 'A bit high after walk',
            'recorded_by' => $grandpa->id,
            'logged_date' => $yesterday->toDateString(),
            'created_at' => $yesterday->copy()->setTime(19, 0),
        ]);

        HealthLog::create([
            'user_id' => $grandma->id,
            'type' => 'heartbeat',
            'value' => json_encode(['reading' => 72]),
            'recorded_by' => $daughter->id,
            'logged_date' => now()->toDateString(),
            'created_at' => now()->subHours(2),
        ]);

        // 10. Seed Alerts
        Alert::create([
            'user_id' => $grandpa->id,
            'type' => 'missed_medication',
            'message' => 'Missed Metformin dose at 20:00.',
            'target_role' => 'caregiver',
            'resolved' => false,
            'created_at' => $yesterday->copy()->setTime(20, 30),
        ]);

        Alert::create([
            'user_id' => $grandma->id,
            'type' => 'emergency',
            'message' => 'Emergency button pressed!',
            'target_role' => 'family',
            'resolved' => false,
            'created_at' => now()->subMinutes(10),
        ]);

        // 11. Seed Check-Ins for timeline
        CheckIn::create([
            'user_id' => $grandpa->id,
            'mood' => 'good',
            'ate' => true,
            'took_meds' => true,
            'drank_water' => true,
            'slept_well' => true,
            'moved_around' => true,
            'in_pain' => false,
            'notes' => 'Had a nice walk in the garden.',
            'created_at' => $yesterday->copy()->setTime(9, 0),
        ]);
        CheckIn::create([
            'user_id' => $grandpa->id,
            'mood' => 'okay',
            'ate' => true,
            'took_meds' => false,
            'drank_water' => true,
            'slept_well' => false,
            'moved_around' => false,
            'in_pain' => true,
            'notes' => 'Knee pain today, did not sleep well.',
            'created_at' => $twoDaysAgo->copy()->setTime(10, 0),
        ]);
        CheckIn::create([
            'user_id' => $grandpa->id,
            'mood' => 'great',
            'ate' => true,
            'took_meds' => true,
            'drank_water' => true,
            'slept_well' => true,
            'moved_around' => true,
            'in_pain' => false,
            'notes' => 'Feeling wonderful after good rest.',
            'created_at' => $threeDaysAgo->copy()->setTime(8, 30),
        ]);
    }
}
