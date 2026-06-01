<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Medication;
use Illuminate\Auth\Access\HandlesAuthorization;
use Illuminate\Support\Facades\DB;

class MedicationPolicy
{
    use HandlesAuthorization;

    public function view(User $user, Medication $medication)
    {
        if ($user->id === $medication->user_id) {
            return true;
        }

        return DB::table('user_relationships')
            ->where('user_id', $medication->user_id)
            ->where('relative_id', $user->id)
            ->exists();
    }

    public function update(User $user, Medication $medication)
    {
        // Only linked caretaker can update medication
        return DB::table('user_relationships')
            ->where('user_id', $medication->user_id)
            ->where('relative_id', $user->id)
            ->where('relation_type', 'caretaker')
            ->exists();
    }

    public function delete(User $user, Medication $medication)
    {
        return $this->update($user, $medication);
    }

    public function take(User $user, Medication $medication)
    {
        if ($user->id === $medication->user_id) {
            return true;
        }

        return DB::table('user_relationships')
            ->where('user_id', $medication->user_id)
            ->where('relative_id', $user->id)
            ->whereIn('relation_type', ['caretaker', 'family'])
            ->exists();
    }
}
