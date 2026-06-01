<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->string('password');
            $table->string('role')->default('elderly'); // elderly, caregiver, child
            $table->unsignedBigInteger('caregiver_id')->nullable();
            $table->string('hospital_name')->nullable();
            $table->string('hospital_contact')->nullable();
            $table->rememberToken();
            $table->timestamps();
        });

        Schema::create('check_ins', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained();
            $table->boolean('ate');
            $table->boolean('took_meds');
            $table->boolean('drank_water');
            $table->boolean('slept_well');
            $table->boolean('moved_around');
            $table->boolean('in_pain');
            $table->string('mood');
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('medications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained();
            $table->string('name');
            $table->string('time')->nullable();
            $table->boolean('is_taken')->default(false);
            $table->timestamps();
        });

        Schema::create('emergency_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained();
            $table->string('status')->default('pending');
            $table->timestamps();
        });

        Schema::create('health_summaries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained();
            $table->date('week_starting');
            $table->text('summary');
            $table->json('recommendations');
            $table->string('concern_level');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('health_summaries');
        Schema::dropIfExists('emergency_logs');
        Schema::dropIfExists('medications');
        Schema::dropIfExists('check_ins');
        Schema::dropIfExists('users');
    }
};
