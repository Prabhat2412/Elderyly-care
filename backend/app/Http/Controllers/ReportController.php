<?php
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use App\Models\RoutineSchedule;
use App\Models\CheckIn;
use Illuminate\Support\Facades\Response;
use Carbon\Carbon;

class ReportController extends Controller
{
    /**
     * Export tasks as CSV
     */
    public function exportTasks(Request $request)
    {
        $query = RoutineSchedule::query()->with('user');

        if ($request->has('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->has('start_date') && $request->has('end_date')) {
            $query->whereBetween('scheduled_time', [$request->start_date, $request->end_date]);
        }

        $tasks = $query->get();

        $csvHeader = ['ID', 'User ID', 'User Name', 'Task Title', 'Type', 'Scheduled Time', 'Completed', 'Missed', 'Marked By'];
        
        $callback = function() use($tasks, $csvHeader) {
            $file = fopen('php://output', 'w');
            fputcsv($file, $csvHeader);

            foreach ($tasks as $task) {
                fputcsv($file, [
                    $task->id,
                    $task->user_id,
                    $task->user->name ?? 'Unknown',
                    $task->title,
                    $task->type,
                    $task->scheduled_time,
                    $task->is_completed ? 'Yes' : 'No',
                    $task->is_missed ? 'Yes' : 'No',
                    $task->marked_by ?? 'N/A'
                ]);
            }

            fclose($file);
        };

        $headers = [
            "Content-type"        => "text/csv",
            "Content-Disposition" => "attachment; filename=tasks_export.csv",
            "Pragma"              => "no-cache",
            "Cache-Control"       => "must-revalidate, post-check=0, pre-check=0",
            "Expires"             => "0"
        ];

        return Response::stream($callback, 200, $headers);
    }
}
