<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Medication;
use App\Models\MedicalProfile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

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
        
        // 3. Create Family Member
        $daughter = User::create([
        'name' => 'Anna Daughter',
            'email' => 'anna@example.com',
            'password' => Hash::make('password'),
            'role' => 'child',
        ]);

        // 4. Establish Relationships
        DB::table('user_relationships')->insert([
            ['user_id' => $grandpa->id, 'relative_id' => $caretaker->id, 'relation_type' => 'caretaker'],
            ['user_id' => $grandma->id, 'relative_id' => $caretaker->id, 'relation_type' => 'caretaker'],
            ['user_id' => $grandpa->id, 'relative_id' => $daughter->id, 'relation_type' => 'family'],
        ]);

        // 5. Create Medical Profiles
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
        Medication::create([
            'user_id' => $grandpa->id,
            'name' => 'Metformin',
            'dosage' => '500mg',
            'instructions' => 'Take with meals',
            'frequency_data' => ['type' => 'daily', 'times' => ['08:00', '20:00']],
            'start_date' => now(),
            'is_active' => true,
        ]);

        Medication::create([
            'user_id' => $grandpa->id,
            'name' => 'Lisinopril',
            'dosage' => '10mg',
            'instructions' => 'Morning dose',
            'frequency_data' => ['type' => 'daily', 'times' => ['08:00']],
            'start_date' => now(),
            'is_active' => true,
        ]);

        // Grandma Mary: Donepezil 1x night, Vitamin D weekly Mon
        Medication::create([
            'user_id' => $grandma->id,
            'name' => 'Donepezil',
            'dosage' => '5mg',
            'instructions' => 'Before bed',
            'frequency_data' => ['type' => 'daily', 'times' => ['22:00']],
            'start_date' => now(),
            'is_active' => true,
        ]);

        Medication::create([
            'user_id' => $grandma->id,
            'name' => 'Vitamin D',
            'dosage' => '1000 IU',
            'instructions' => 'Weekly supplement',
            'frequency_data' => ['type' => 'weekly', 'times' => ['10:00'], 'days' => ['monday']],
            'start_date' => now(),
            'is_active' => true,
        ]);

        // 6. Create Routine Schedules
        \App\Models\RoutineSchedule::create([
            'user_id' => $grandpa->id,
            'title' => 'Breakfast',
            'type' => 'meal',
            'scheduled_time' => '08:00:00'
        ]);

        \App\Models\RoutineSchedule::create([
            'user_id' => $grandpa->id,
            'title' => 'Lunch',
            'type' => 'meal',
            'scheduled_time' => '13:00:00'
        ]);

        \App\Models\RoutineSchedule::create([
            'user_id' => $grandpa->id,
            'title' => 'Hydration Check',
            'type' => 'hydration',
            'scheduled_time' => '10:30:00'
        ]);

        \App\Models\RoutineSchedule::create([
            'user_id' => $grandpa->id,
            'title' => 'Evening Walk',
            'type' => 'activity',
            'scheduled_time' => '17:00:00'
        ]);

        // 7. Vitals Schedules
        \App\Models\RoutineSchedule::create([
            'user_id' => $grandpa->id,
            'title' => 'Blood Pressure Check',
            'type' => 'vital',
            'metric_type' => 'blood_pressure',
            'frequency_data' => ['type' => 'daily', 'times' => ['08:30', '19:00']]
        ]);

        \App\Models\RoutineSchedule::create([
            'user_id' => $grandpa->id,
            'title' => 'Glucose Check (Fasting)',
            'type' => 'vital',
            'metric_type' => 'glucose',
            'frequency_data' => ['type' => 'weekly', 'times' => ['07:00'], 'days' => ['monday']]
        ]);

        \App\Models\RoutineSchedule::create([
            'user_id' => $grandpa->id,
            'title' => 'Temperature Check',
            'type' => 'vital',
            'metric_type' => 'temp',
            'frequency_data' => ['type' => 'daily', 'times' => ['09:00', '21:00']]
        ]);
    }
}
