<?php
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\RoutineSchedule;
use App\Models\CheckIn;
use App\Models\User;
use App\Models\Alert;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class AnalyticsController extends Controller
{
    /**
     * Dashboard adherence overview for a specific patient
     * accessible by caregiver or family or admin.
     */
    public function patientAdherence(Request $request, User $user)
    {
        // 7 days lookback
        $startDate = Carbon::now()->subDays(7)->startOfDay();
        $endDate = Carbon::now()->endOfDay();

        $tasks = RoutineSchedule::where('user_id', $user->id)
            ->whereBetween('scheduled_time', [$startDate, $endDate])
            ->get();

        $total = $tasks->count();
        $completed = $tasks->where('is_completed', true)->count();
        $missed = $tasks->where('is_missed', true)->count();
        
        $adherenceRate = $total > 0 ? round(($completed / $total) * 100, 2) : 0;

        return response()->json([
            'total_tasks' => $total,
            'completed' => $completed,
            'missed' => $missed,
            'adherence_rate' => $adherenceRate,
        ]);
    }

    /**
     * System-wide analytics for admin
     */
    public function systemAnalytics(Request $request)
    {
        $startDate = Carbon::now()->subDays(30)->startOfDay();
        
        $activeAlerts = Alert::where('resolved', false)->count();
        $resolvedAlerts = Alert::where('resolved', true)
                               ->where('created_at', '>=', $startDate)
                               ->count();
                               
        $recentCheckIns = CheckIn::where('created_at', '>=', $startDate)->count();

        // Tasks missed vs completed last 30 days
        $tasksData = RoutineSchedule::select(
            DB::raw('DATE(scheduled_time) as date'),
            DB::raw('SUM(is_completed) as completed'),
            DB::raw('SUM(is_missed) as missed')
        )
        ->where('scheduled_time', '>=', $startDate)
        ->groupBy('date')
        ->orderBy('date', 'asc')
        ->get();

        return response()->json([
            'active_alerts' => $activeAlerts,
            'resolved_alerts_30d' => $resolvedAlerts,
            'check_ins_30d' => $recentCheckIns,
            'tasks_trend' => $tasksData
        ]);
    }
}
