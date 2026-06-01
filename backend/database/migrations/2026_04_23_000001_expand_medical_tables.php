<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('medical_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->json('chronic_conditions')->nullable();
            $table->json('allergies')->nullable();
            $table->string('blood_type')->nullable();
            $table->string('cognitive_status')->nullable(); // stable, declining, impaired
            $table->string('fall_risk')->default('low'); // low, moderate, high
            $table->json('emergency_contacts')->nullable();
            $table->json('monitored_metrics')->nullable(); // e.g., ["heartbeat", "blood_pressure"]
            $table->timestamps();
        });

        Schema::table('medications', function (Blueprint $table) {
            $table->string('dosage')->nullable()->after('name');
            $table->text('instructions')->nullable()->after('dosage');
            $table->json('frequency_data')->nullable()->after('instructions'); // e.g., ["morning", "afternoon"]
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->boolean('is_active')->default(true);
        });

        Schema::create('health_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('type'); // bp, glucose, weight, temp
            $table->json('value'); // { "systolic": 120, "diastolic": 80 } or { "reading": 5.4 }
            $table->string('unit')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('health_logs');
        Schema::table('medications', function (Blueprint $table) {
            $table->dropColumn(['dosage', 'instructions', 'frequency_data', 'start_date', 'end_date', 'is_active']);
        });
        Schema::dropIfExists('medical_profiles');
    }
};
