<?php  // <--- THIS MUST BE AT THE TOP

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController; // <--- Make sure this is imported

// Public Routes
Route::post('/send-otp', [AuthController::class, 'sendOtp']);
Route::post('/verify-otp', [AuthController::class, 'verifyOtp']);

// Protected Routes (Only for logged-in users with a valid token)
Route::middleware('auth:sanctum')->group(function () {
    
    // The route we used for the Dashboard
    Route::get('/user', function (Request $request) {
        return $request->user();
    });

    // NEW: The route for the Members Screen
    Route::get('/members', [App\Http\Controllers\Api\AuthController::class, 'getMembers']);
});