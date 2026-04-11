<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\GroupController;
use App\Http\Controllers\Api\TransactionController;
use App\Http\Controllers\Api\MeetingController;
use App\Http\Controllers\Api\LoanController;
use App\Http\Controllers\Api\NotificationController;

/*
|--------------------------------------------------------------------------
| Public Routes (No Token Needed)
|--------------------------------------------------------------------------
*/
Route::post('/send-otp', [AuthController::class, 'sendOtp']);
Route::post('/verify-otp', [AuthController::class, 'verifyOtp']);
Route::post('/login-password', [AuthController::class, 'loginWithPassword']); 
Route::post('/register', [AuthController::class, 'register']);
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
    Route::put('/user/profile/update', [AuthController::class, 'updateProfile']);
    Route::post('/user/ledger/export', [TransactionController::class, 'exportUserLedger']);
    Route::post('/user/profile/photo', [App\Http\Controllers\Api\AuthController::class, 'uploadProfilePhoto']);
    Route::get('/user/all-loans', [App\Http\Controllers\Api\LoanController::class, 'getAllUserLoans']);

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
    
    // Account & Group Deletion Routes
    Route::delete('/user/profile/delete', [App\Http\Controllers\Api\AuthController::class, 'deleteProfile']);
    Route::delete('/group/{id}/delete', [App\Http\Controllers\Api\GroupController::class, 'deleteGroup']);

    // Financial Dashboard Route
    Route::get('/group/{groupId}/corpus', [GroupController::class, 'getCorpusStats']);
    
    // Transaction / Ledger Routes
    Route::get('/user/transactions', [TransactionController::class, 'getUserTransactions']); // <-- FIXED: Flipped to match frontend!
    Route::post('/transactions/deposit', [TransactionController::class, 'deposit']);
    Route::get('/passbook', [TransactionController::class, 'passbook']);
    Route::put('/transactions/{id}', [TransactionController::class, 'update']);
    Route::delete('/transactions/{id}', [TransactionController::class, 'destroy']);
    Route::post('/group/{groupId}/transactions/batch', [TransactionController::class, 'storeBatch']);
    Route::post('/group/{groupId}/penalty', [TransactionController::class, 'chargePenalty']);
    Route::post('/group/{groupId}/ledger/export', [TransactionController::class, 'exportGroupLedger']);

    // --- Loan Origination System ---
    Route::post('/group/{groupId}/loan/request', [LoanController::class, 'requestLoan']);
    Route::post('/group/{groupId}/loan/{loanId}/approve', [LoanController::class, 'approveLoan']);
    Route::post('/group/{groupId}/loan/{loanId}/reject', [LoanController::class, 'rejectLoan']);
    Route::get('/group/{groupId}/loans', [LoanController::class, 'getGroupLoans']);
    
    // Loan Repayment Route
    Route::post('/loan/{loanId}/repay', [LoanController::class, 'repayLoan']);
   
    // Meeting Minutes & Attendance Sync
    Route::post('/meetings/sync', [MeetingController::class, 'syncMinutes']);

    // In App Notifications
    Route::get('/notifications', [NotificationController::class, 'getNotifications']);
    Route::post('/notifications/read', [NotificationController::class, 'markAsRead']);

});