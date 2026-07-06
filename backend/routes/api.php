<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

use App\Http\Controllers\AuthController;
use App\Http\Controllers\CheckInController;
use App\Http\Controllers\EmergencyController;
use App\Http\Controllers\LocationController;
use App\Http\Controllers\MedicationController;
use App\Http\Controllers\PatientController;

Route::get('/health', function () {
    return response()->json(['status' => 'ok', 'timestamp' => now()]);
});

Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:10,1');
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:10,1');
Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:3,1');
Route::post('/reset-password', [AuthController::class, 'resetPassword'])->middleware('throttle:3,1');

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', function (Request $request) {
        return $request->user();
    });

    Route::get('/profile', [\App\Http\Controllers\ProfileController::class, 'show']);
    Route::put('/profile', [\App\Http\Controllers\ProfileController::class, 'update']);
    Route::post('/profile/change-password', [\App\Http\Controllers\ProfileController::class, 'changePassword']);

    Route::post('/emergency', [EmergencyController::class, 'trigger'])->middleware('throttle:5,1');
    Route::post('/checkin', [CheckInController::class, 'store']);
    Route::post('/location', [LocationController::class, 'store']);
    Route::get('/location/{userId}', [LocationController::class, 'show']);
    
    Route::get('/medications', [MedicationController::class, 'index']);
    Route::post('/medications', [MedicationController::class, 'store']);
    Route::put('/medications/{medication}', [MedicationController::class, 'update']);
    Route::delete('/medications/{medication}', [MedicationController::class, 'destroy']);
    Route::post('/medications/{medication}/take', [MedicationController::class, 'take']);
    Route::post('/medications/{medication}/miss', [MedicationController::class, 'miss']);

    Route::get('/patients', [PatientController::class, 'index']);
    Route::get('/patients/{patient}', [PatientController::class, 'show']);
    Route::get('/patients/{patient}/ai-summary', [PatientController::class, 'aiSummary']);
    Route::get('/patients/{patient}/timeline', [PatientController::class, 'timeline']);
    Route::post('/patients/{patient}/chatbot', [\App\Http\Controllers\ChatbotController::class, 'chat']);
    Route::post('/patients/active', [PatientController::class, 'setActive']);

    Route::get('/patients/{user}/profile', [\App\Http\Controllers\MedicalProfileController::class, 'show']);
    Route::put('/patients/{user}/profile', [\App\Http\Controllers\MedicalProfileController::class, 'update']);

    Route::get('/health-logs', [\App\Http\Controllers\HealthLogController::class, 'index']);
    Route::post('/health-logs', [\App\Http\Controllers\HealthLogController::class, 'store']);
    Route::get('/alerts', [\App\Http\Controllers\AlertController::class, 'index']);
    Route::post('/alerts/{alert}/resolve', [\App\Http\Controllers\AlertController::class, 'resolve']);

    Route::get('/daily-tasks', [\App\Http\Controllers\RoutineScheduleController::class, 'dailyTasks']);
    Route::get('/schedules', [\App\Http\Controllers\RoutineScheduleController::class, 'index']);
    Route::post('/schedules', [\App\Http\Controllers\RoutineScheduleController::class, 'store']);
    Route::post('/schedules/{schedule}/complete', [\App\Http\Controllers\RoutineScheduleController::class, 'complete']);
    Route::post('/schedules/{schedule}/miss', [\App\Http\Controllers\RoutineScheduleController::class, 'miss']);

    Route::middleware('admin')->prefix('admin')->group(function () {
        Route::get('/dashboard', [\App\Http\Controllers\Admin\AdminController::class, 'dashboard']);
        Route::get('/users', [\App\Http\Controllers\Admin\AdminController::class, 'users']);
        Route::get('/users/{user}', [\App\Http\Controllers\Admin\AdminController::class, 'showUser']);
        Route::put('/users/{user}', [\App\Http\Controllers\Admin\AdminController::class, 'updateUser']);
        Route::delete('/users/{user}', [\App\Http\Controllers\Admin\AdminController::class, 'deleteUser']);
        Route::get('/users/{user}/relationships', [\App\Http\Controllers\Admin\AdminController::class, 'userRelationships']);
        
        Route::get('/analytics', [\App\Http\Controllers\AnalyticsController::class, 'systemAnalytics']);
        Route::get('/reports/tasks', [\App\Http\Controllers\ReportController::class, 'exportTasks']);
    });
    
    Route::get('/users/{user}/adherence', [\App\Http\Controllers\AnalyticsController::class, 'patientAdherence']);
});
