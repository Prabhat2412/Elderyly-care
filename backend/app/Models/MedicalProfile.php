<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MedicalProfile extends Model
{
    protected $fillable = [
        'user_id', 'chronic_conditions', 'allergies', 'blood_type', 
        'cognitive_status', 'fall_risk', 'emergency_contacts', 'monitored_metrics'
    ];

    protected $casts = [
        'chronic_conditions' => 'array',
        'allergies' => 'array',
        'emergency_contacts' => 'array',
        'monitored_metrics' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
