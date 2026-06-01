<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens;

    protected $fillable = [
        'name', 'email', 'password', 'role', 'caregiver_id', 
        'hospital_name', 'hospital_contact'
    ];

    protected $hidden = [
        'password', 'remember_token',
    ];

    /**
     * Get the patients this user is taking care of (if caretaker).
     */
    public function patients()
    {
        return $this->belongsToMany(User::class, 'user_relationships', 'relative_id', 'user_id')
                    ->whereIn('relation_type', ['caretaker', 'family']);
    }

    /**
     * Get the family members linked to this elderly user.
     */
    public function family()
    {
        return $this->belongsToMany(User::class, 'user_relationships', 'user_id', 'relative_id')
                    ->where('relation_type', 'family');
    }

    /**
     * Get the caretaker for this elderly user.
     */
    public function caretakers()
    {
        return $this->belongsToMany(User::class, 'user_relationships', 'user_id', 'relative_id')
                    ->where('relation_type', 'caretaker');
    }

    public function checkins()
    {
        return $this->hasMany(CheckIn::class);
    }

    public function medications()
    {
        return $this->hasMany(Medication::class);
    }
}
