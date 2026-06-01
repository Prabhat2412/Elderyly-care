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
            $table->json('sub_tasks')->nullable()->after('metric_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('routine_schedules', function (Blueprint $table) {
            $table->dropColumn('sub_tasks');
        });
    }
};
