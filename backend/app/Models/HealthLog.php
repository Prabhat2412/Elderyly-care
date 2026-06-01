<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HealthLog extends Model
{
    protected $fillable = [
        'user_id',
        'source_task_type',
        'source_task_id',
        'scheduled_time',
        'logged_date',
        'recorded_by',
        'type',
        'value',
        'unit',
        'notes',
    ];

    protected $casts = [
        'value' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
