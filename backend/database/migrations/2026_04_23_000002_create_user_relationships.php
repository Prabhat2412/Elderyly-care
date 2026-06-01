<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_relationships', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade'); // The main user (elderly)
            $table->foreignId('relative_id')->constrained('users')->onDelete('cascade'); // The linked user (caretaker or family)
            $table->string('relation_type'); // 'caretaker', 'family'
            $table->timestamps();
        });

        // Add a helper column to users to identify who they are caring for (optional but helpful)
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('active_elderly_id')->nullable()->constrained('users')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['active_elderly_id']);
            $table->dropColumn('active_elderly_id');
        });
        Schema::dropIfExists('user_relationships');
    }
};
