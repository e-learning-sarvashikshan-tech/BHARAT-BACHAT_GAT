<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;

/*
|--------------------------------------------------------------------------
| Public Routes (No Token Needed)
|--------------------------------------------------------------------------
*/
// Users can access these without being logged in
Route::post('/send-otp', [AuthController::class, 'sendOtp']);
Route::post('/verify-otp', [AuthController::class, 'verifyOtp']);
Route::post('/login-password', [AuthController::class, 'loginWithPassword']); 


/*
|--------------------------------------------------------------------------
| Protected Routes (Token Required)
|--------------------------------------------------------------------------
*/
// Users MUST have a valid token to access these
Route::middleware('auth:sanctum')->group(function () {
    
    // User Info & Dashboard
    Route::get('/user', function (Request $request) {
        return $request->user();
    });
    Route::get('/user/dashboard', [AuthController::class, 'getDashboardStats']);

    // Member Management
    Route::get('/members', [AuthController::class, 'getMembers']);
    Route::post('/members/add', [AuthController::class, 'addMember']);
    Route::delete('/members/{id}', [AuthController::class, 'removeMember']);
    
    // Savings Logic
    Route::post('/savings/deposit', [AuthController::class, 'depositSavings']);

});