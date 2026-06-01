<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('health_logs', function (Blueprint $table) {
            $table->string('source_task_type')->nullable()->after('user_id');
            $table->unsignedBigInteger('source_task_id')->nullable()->after('source_task_type');
            $table->time('scheduled_time')->nullable()->after('source_task_id');
            $table->date('logged_date')->nullable()->after('scheduled_time');
            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete()->after('logged_date');
        });
    }

    public function down(): void
    {
        Schema::table('health_logs', function (Blueprint $table) {
            $table->dropForeign(['recorded_by']);
            $table->dropColumn(['source_task_type', 'source_task_id', 'scheduled_time', 'logged_date', 'recorded_by']);
        });
    }
};
