<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;
use Illuminate\Support\Facades\DB;

class PatientPolicy
{
    use HandlesAuthorization;

    public function view(User $user, User $patient)
    {
        if ($user->id === $patient->id) {
            return true;
        }

        // Check if user is linked to patient as caretaker or family
        return DB::table('user_relationships')
            ->where('user_id', $patient->id)
            ->where('relative_id', $user->id)
            ->exists();
    }

    public function update(User $user, User $patient)
    {
        if ($user->id === $patient->id) {
            return true;
        }

        // Only linked caretaker can update
        return DB::table('user_relationships')
            ->where('user_id', $patient->id)
            ->where('relative_id', $user->id)
            ->where('relation_type', 'caretaker')
            ->exists();
    }
}
