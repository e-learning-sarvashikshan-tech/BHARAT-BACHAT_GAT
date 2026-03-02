<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\API\GroupController;
use App\Http\Controllers\API\TransactionController;
use App\Http\Controllers\API\MeetingController;

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
        // Updated to automatically load the user's Bachat Gat group details
        return $request->user()->load('group');
    });
    
    // Updated to use the clean GroupController we built
    Route::get('/user/dashboard', [GroupController::class, 'dashboard']);

    // Group & Member Management 
    Route::post('/group/create', [GroupController::class, 'createGroup']);
    Route::post('/group/join', [GroupController::class, 'joinGroup']);
    Route::get('/group/members', [GroupController::class, 'getMembers']);
    
    // Transaction / Ledger Routes (Replaces the old /savings/deposit)
    Route::post('/transactions/deposit', [TransactionController::class, 'deposit']);
    Route::get('/passbook', [TransactionController::class, 'passbook']);
    Route::put('/transactions/{id}', [TransactionController::class, 'update']);
    Route::delete('/transactions/{id}', [TransactionController::class, 'destroy']);

    // Meeting Minutes & Attendance Sync
    Route::post('/meetings/sync', [MeetingController::class, 'syncMinutes']);

});