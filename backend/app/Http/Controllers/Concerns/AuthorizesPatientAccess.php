<?php

namespace App\Http\Controllers\Concerns;

use App\Models\User;
use Illuminate\Support\Facades\DB;

trait AuthorizesPatientAccess
{
    protected function canAccessPatient(User $actor, int $patientId): bool
    {
        if ($actor->id === $patientId) {
            return true;
        }

        return DB::table('user_relationships')
            ->where('user_id', $patientId)
            ->where('relative_id', $actor->id)
            ->exists();
    }

    protected function isCaregiverOrFamily(User $actor, int $patientId): bool
    {
        if ($actor->id === $patientId) {
            return false;
        }

        return DB::table('user_relationships')
            ->where('user_id', $patientId)
            ->where('relative_id', $actor->id)
            ->whereIn('relation_type', ['caretaker', 'family'])
            ->exists();
    }
}
