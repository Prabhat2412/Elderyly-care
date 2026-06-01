<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

use App\Http\Controllers\AuthController;
use App\Http\Controllers\CheckInController;
use App\Http\Controllers\EmergencyController;
use App\Http\Controllers\MedicationController;
use App\Http\Controllers\PatientController;

Route::get('/health', function () {
    return response()->json(['status' => 'ok', 'timestamp' => now()]);
});

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', function (Request $request) {
        return $request->user();
    });

    Route::post('/emergency', [EmergencyController::class, 'trigger']);
    Route::post('/checkin', [CheckInController::class, 'store']);
    
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
});
