<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('routine_schedules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('title');
            $table->string('type'); // meal, hydration, activity
            $table->time('scheduled_time');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('completed_tasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('task_type'); // routine, medication
            $table->unsignedBigInteger('task_id');
            $table->date('completed_at_date');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('completed_tasks');
        Schema::dropIfExists('routine_schedules');
    }
};
