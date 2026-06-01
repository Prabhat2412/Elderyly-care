<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MissedTask extends Model
{
    protected $fillable = [
        'user_id',
        'task_type',
        'task_id',
        'scheduled_time',
        'missed_at_date',
        'marked_by',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
