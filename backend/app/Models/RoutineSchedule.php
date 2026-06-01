<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RoutineSchedule extends Model
{
    protected $fillable = ['user_id', 'title', 'type', 'metric_type', 'sub_tasks', 'frequency_data', 'scheduled_time', 'is_active'];

    protected $casts = [
        'frequency_data' => 'array',
        'sub_tasks' => 'array',
        'is_active' => 'boolean'
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
