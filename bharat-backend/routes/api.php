<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\GroupController;
use App\Http\Controllers\Api\TransactionController;
use App\Http\Controllers\Api\MeetingController;
use App\Http\Controllers\Api\LoanController;

/*
|--------------------------------------------------------------------------
| Public Routes (No Token Needed)
|--------------------------------------------------------------------------
*/
Route::post('/send-otp', [AuthController::class, 'sendOtp']);
Route::post('/verify-otp', [AuthController::class, 'verifyOtp']);
Route::post('/login-password', [AuthController::class, 'loginWithPassword']); 

/*
|--------------------------------------------------------------------------
| Protected Routes (Token Required)
|--------------------------------------------------------------------------
*/
Route::middleware('auth:sanctum')->group(function () {
    
    // User Info & Dashboard
    Route::get('/user', function (Request $request) { return $request->user()->load('groups');});
    Route::get('/user/dashboard', [GroupController::class, 'dashboard']);
    Route::get('/user/portfolio', [GroupController::class, 'getPersonalPortfolio']);

    // Group & Member Management 
    Route::post('/group/create', [GroupController::class, 'createGroup']);
    Route::post('/group/join', [GroupController::class, 'joinGroup']);
    Route::get('/group/{id}', [GroupController::class, 'getGroupDetails']);
    Route::post('/group/{groupId}/approve/{userId}', [GroupController::class, 'approveMember']);
    Route::post('/group/{groupId}/promote/{userId}', [GroupController::class, 'promoteMember']);
    Route::post('/group/{groupId}/demote/{userId}', [GroupController::class, 'demoteMember']);
    Route::delete('/group/{groupId}/remove/{userId}', [GroupController::class, 'removeMember']);
    Route::post('/members/add', [GroupController::class, 'addMemberManually']);
    Route::get('/groups/{groupId}/history', [MeetingController::class, 'getHistory']);
    
    // Financial Dashboard Route
    Route::get('/group/{groupId}/corpus', [GroupController::class, 'getCorpusStats']);
    
    // Transaction / Ledger Routes
    Route::get('/user/transactions', [TransactionController::class, 'getUserTransactions']);
    Route::post('/transactions/deposit', [TransactionController::class, 'deposit']);
    Route::get('/passbook', [TransactionController::class, 'passbook']);
    Route::put('/transactions/{id}', [TransactionController::class, 'update']);
    Route::delete('/transactions/{id}', [TransactionController::class, 'destroy']);
    Route::post('/group/{groupId}/transactions/batch', [TransactionController::class, 'storeBatch']);
    Route::post('/group/{groupId}/penalty', [TransactionController::class, 'chargePenalty']);

    // --- Loan Origination System ---
    Route::post('/group/{groupId}/loan/request', [LoanController::class, 'requestLoan']);
    Route::post('/group/{groupId}/loan/{loanId}/approve', [LoanController::class, 'approveLoan']);
    Route::post('/group/{groupId}/loan/{loanId}/reject', [LoanController::class, 'rejectLoan']);
    Route::get('/group/{groupId}/loans', [LoanController::class, 'getGroupLoans']);
    
    // Loan Repayment Route
    Route::post('/loan/{loanId}/repay', [LoanController::class, 'repayLoan']);
   
    // Meeting Minutes & Attendance Sync
    Route::post('/meetings/sync', [MeetingController::class, 'syncMinutes']);

});