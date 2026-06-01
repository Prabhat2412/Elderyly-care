<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Alert extends Model
{
    protected $fillable = ['user_id', 'type', 'message', 'resolved', 'target_role'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
