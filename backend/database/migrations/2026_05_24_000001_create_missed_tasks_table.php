<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('missed_tasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('task_type'); // routine, medication
            $table->unsignedBigInteger('task_id');
            $table->time('scheduled_time');
            $table->date('missed_at_date');
            $table->string('marked_by')->default('elderly'); // elderly, auto, caregiver, child
            $table->timestamps();

            $table->unique(
                ['user_id', 'task_type', 'task_id', 'scheduled_time', 'missed_at_date'],
                'missed_tasks_unique_daily'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('missed_tasks');
    }
};
