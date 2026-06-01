<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CompletedTask extends Model
{
    protected $fillable = ['user_id', 'task_type', 'task_id', 'scheduled_time', 'completed_at_date'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
