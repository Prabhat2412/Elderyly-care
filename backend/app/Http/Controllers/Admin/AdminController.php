<?php
namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Medication;
use App\Models\Alert;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminController extends Controller
{
    public function dashboard()
    {
        $totalUsers = User::count();
        $usersByRole = User::select('role', DB::raw('count(*) as total'))
                           ->groupBy('role')
                           ->get()
                           ->pluck('total', 'role');
        $totalMedications = Medication::count();
        $totalAlerts = Alert::count();
        $unresolvedAlerts = Alert::where('resolved', false)->count();

        return response()->json([
            'total_users' => $totalUsers,
            'users_by_role' => $usersByRole,
            'total_medications' => $totalMedications,
            'total_alerts' => $totalAlerts,
            'unresolved_alerts' => $unresolvedAlerts,
        ]);
    }

    public function users(Request $request)
    {
        $query = User::query();

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if ($request->has('role') && $request->role !== 'all') {
            $query->where('role', $request->role);
        }

        $sort = $request->get('sort', 'created_at');
        $order = $request->get('order', 'desc');
        $query->orderBy($sort, $order);

        $perPage = $request->get('per_page', 20);
        return response()->json($query->paginate($perPage));
    }

    public function showUser(User $user)
    {
        $user->load(['medications', 'caretakers', 'family', 'patients']);
        
        $user->load(['checkins' => function ($q) {
            $q->orderBy('created_at', 'desc')->take(10);
        }]);

        return response()->json($user);
    }

    public function updateUser(Request $request, User $user)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,' . $user->id,
            'role' => 'sometimes|string|in:elderly,caregiver,family,admin',
            'is_suspended' => 'sometimes|boolean',
        ]);

        $user->update($validated);
        return response()->json($user);
    }

    public function deleteUser(User $user)
    {
        $user->delete();
        return response()->json(['message' => 'User deleted successfully.']);
    }

    public function userRelationships(User $user)
    {
        $user->load(['caretakers', 'family', 'patients']);
        return response()->json([
            'caretakers' => $user->caretakers,
            'patients' => $user->patients,
            'family' => $user->family,
        ]);
    }
}
