<?php

namespace App\Http\Controllers;

use App\Models\Alert;
use Illuminate\Http\Request;

class AlertController extends Controller
{
    public function index(Request $request)
    {
        $query = Alert::query()->with('user');
        
        $user = $request->user();

        if ($request->has('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        if ($user->role !== 'admin') {
            $query->where('target_role', $user->role);
        }

        return $query->latest()->get();
    }

    public function resolve(Alert $alert)
    {
        $alert->update(['resolved' => true]);
        return response()->json($alert);
    }
}
