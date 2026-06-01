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
        Schema::table('routine_schedules', function (Blueprint $table) {
            $table->json('frequency_data')->nullable()->after('type');
            $table->string('metric_type')->nullable()->after('type'); // heartbeat, pressure, glucose, etc.
            $table->time('scheduled_time')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('routine_schedules', function (Blueprint $table) {
            $table->dropColumn(['frequency_data', 'metric_type']);
            $table->time('scheduled_time')->nullable(false)->change();
        });
    }
};
