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
        Schema::table('completed_tasks', function (Blueprint $table) {
            $table->string('sub_task_key')->nullable()->after('task_id');
        });

        Schema::table('missed_tasks', function (Blueprint $table) {
            $table->string('sub_task_key')->nullable()->after('task_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('completed_tasks', function (Blueprint $table) {
            $table->dropColumn('sub_task_key');
        });

        Schema::table('missed_tasks', function (Blueprint $table) {
            $table->dropColumn('sub_task_key');
        });
    }
};
