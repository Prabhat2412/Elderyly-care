<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CheckIn extends Model
{
    protected $fillable = [
        'user_id', 'ate', 'took_meds', 'drank_water', 'slept_well', 
        'moved_around', 'in_pain', 'mood', 'notes'
    ];
}
