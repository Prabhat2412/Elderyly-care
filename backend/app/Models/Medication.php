<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Medication extends Model
{
    protected $fillable = [
        'user_id', 'name', 'dosage', 'instructions', 
        'frequency_data', 'start_date', 'end_date', 'is_active'
    ];

    protected $casts = [
        'frequency_data' => 'array',
        'is_active' => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
