<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Transaction;
use App\Models\TransactionAudit; 
use App\Models\AppNotification; 
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class TransactionController extends Controller
{
    public function getUserTransactions()
    {
        try {
            // Eager load the group so the Statement can display the Group Name
            $transactions = Transaction::with('group:id,name')
                ->where('user_id', Auth::id())
                ->orderBy('transaction_date', 'desc')
                ->get();

            return response()->json([
                'status' => 'success',
                'transactions' => $transactions
            ], 200);
            
        } catch (\Exception $e) {
            return response()->json(['status' => 'error', 'message' => 'Failed to fetch user transactions.'], 500);
        }
    }

    public function deposit(Request $request)
    {
        try {
            $request->validate([
                'amount' => 'required|numeric|min:1',
                'type' => 'required|string|in:deposit,withdrawal',
                'method' => 'required|string',
                'group_id' => 'required|exists:groups,id',
                'user_id' => 'required|exists:users,id' 
            ]);

            $admin = Auth::user();

            $isAdmin = $admin->groups()
                             ->where('group_id', $request->group_id)
                             ->wherePivot('role', 'admin')
                             ->exists();

            if (!$isAdmin) {
                return response()->json([
                    'status' => 'error', 
                    'message' => 'Unauthorized. Only group admins can add savings for members.'
                ], 403);
            }

            $transaction = \App\Models\Transaction::create([
                'user_id' => $request->user_id,
                'group_id' => $request->group_id,
                'amount' => $request->amount,
                'type' => strtolower($request->type),
                'method' => $request->method,
                'category' => 'savings',
                'transaction_date' => now()
            ]);

            $group = \App\Models\Group::find($request->group_id);
            $targetUser = \App\Models\User::find($request->user_id);

            AppNotification::create([
                'user_id' => $request->user_id,
                'group_id' => $request->group_id, 
                'title' => 'Deposit Received',
                'message' => "₹{$request->amount} was deposited for {$targetUser->name} in {$group->name}."
            ]);

            return response()->json([
                'status' => 'success', 
                'message' => 'Member savings recorded successfully!', 
                'transaction' => $transaction
            ], 200);

        } catch (\Exception $e) {
            Log::error("Deposit Error: " . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to save transaction. ' . $e->getMessage()
            ], 500);
        }
    }

    public function update(Request $request, $id)
    {
        try {
            $request->validate([
                'amount' => 'required|numeric|min:1',
                'method' => 'nullable|string',
                'edit_reason' => 'required|string|max:255' 
            ]);

            $transaction = \App\Models\Transaction::find($id);

            if (!$transaction) {
                return response()->json(['status' => 'error', 'message' => 'Transaction not found.'], 404);
            }

            $user = Auth::user();
            $isOwner = $transaction->user_id === $user->id;
            $isAdmin = $user->groups()
                            ->where('group_id', $transaction->group_id)
                            ->wherePivot('role', 'admin')
                            ->exists();

            if (!$isOwner && !$isAdmin) {
                return response()->json(['status' => 'error', 'message' => 'Unauthorized.'], 403);
            }

            $oldAmount = $transaction->amount;

            $transaction->amount = $request->amount;
            if ($request->has('method')) {
                $transaction->method = $request->method . ' [Edited: ' . $request->edit_reason . ']';
            }
            $transaction->save();

            TransactionAudit::create([
                'transaction_id' => $transaction->id,
                'admin_id' => $user->id,
                'action' => 'edited',
                'old_amount' => $oldAmount,
                'new_amount' => $request->amount,
                'reason' => $request->edit_reason,
            ]);

            $group = \App\Models\Group::find($transaction->group_id);

            AppNotification::create([
                'user_id' => $transaction->user_id,
                'group_id' => $transaction->group_id, 
                'title' => 'Record Edited',
                'message' => "Your transaction in {$group->name} was changed from ₹{$oldAmount} to ₹{$request->amount}. Reason: {$request->edit_reason}."
            ]);

            return response()->json([
                'status' => 'success', 
                'message' => 'Transaction updated securely.',
                'transaction' => $transaction
            ], 200);

        } catch (\Exception $e) {
            return response()->json(['status' => 'error', 'message' => 'Update failed: ' . $e->getMessage()], 500);
        }
    }

    public function destroy(Request $request, $id)
    {
        try {
            $request->validate([
                'delete_reason' => 'required|string|max:255' 
            ]);

            $transaction = \App\Models\Transaction::find($id);

            if (!$transaction) {
                return response()->json(['status' => 'error', 'message' => 'Transaction not found.'], 404);
            }

            $user = Auth::user();
            $isOwner = $transaction->user_id === $user->id;
            $isAdmin = $user->groups()
                            ->where('group_id', $transaction->group_id)
                            ->wherePivot('role', 'admin')
                            ->exists();

            if (!$isOwner && !$isAdmin) {
                return response()->json(['status' => 'error', 'message' => 'Unauthorized.'], 403);
            }

            $oldAmount = $transaction->amount;

            $transaction->amount = 0;
            $transaction->category = 'voided';
            $transaction->method = 'VOIDED: ' . $request->delete_reason;
            $transaction->save();

            TransactionAudit::create([
                'transaction_id' => $transaction->id,
                'admin_id' => $user->id,
                'action' => 'deleted',
                'old_amount' => $oldAmount,
                'new_amount' => 0,
                'reason' => $request->delete_reason,
            ]);

            $group = \App\Models\Group::find($transaction->group_id);

            AppNotification::create([
                'user_id' => $transaction->user_id,
                'group_id' => $transaction->group_id, 
                'title' => 'Record Cancelled',
                'message' => "A transaction of ₹{$oldAmount} in {$group->name} was cancelled. Reason: {$request->delete_reason}."
            ]);

            return response()->json([
                'status' => 'success', 
                'message' => 'Transaction voided securely.'
            ], 200);

        } catch (\Exception $e) {
            return response()->json(['status' => 'error', 'message' => 'Delete failed: ' . $e->getMessage()], 500);
        }
    }

    public function passbook()
    {
        $transactions = Transaction::where('user_id', Auth::id())
                                   ->orderBy('id', 'desc') 
                                   ->get();
                                   
        return response()->json([
            'status' => 'success',
            'transactions' => $transactions
        ], 200);
    }

    public function storeBatch(Request $request, $groupId)
    {
        try {
            $request->validate([
                'user_ids' => 'required|array',
                'amount' => 'required|numeric|min:1'
            ]);

            $insertedCount = 0;

            DB::transaction(function () use ($request, $groupId, &$insertedCount) {
                $amountPerUser = $request->amount;
                
                foreach ($request->user_ids as $userId) {
                    \App\Models\Transaction::create([
                        'group_id' => $groupId,
                        'user_id' => $userId,
                        'amount' => $amountPerUser,
                        'type' => 'deposit', 
                        'method' => 'cash', 
                        'category' => 'savings',
                        'transaction_date' => now()
                    ]);
                    
                    $group = \App\Models\Group::find($groupId);
                    $targetUser = \App\Models\User::find($userId);

                    AppNotification::create([
                        'user_id' => $userId,
                        'group_id' => $groupId, 
                        'title' => 'Deposit Received',
                        'message' => "₹{$amountPerUser} was deposited for {$targetUser->name} in {$group->name}."
                    ]);

                    $insertedCount++;
                }
            }); 

            return response()->json([
                'status' => 'success',
                'message' => "Successfully recorded savings for $insertedCount members!"
            ], 200);

        } catch (\Throwable $e) {
            Log::error("Batch Transaction Error: " . $e->getMessage());
            return response()->json(['status' => 'error', 'message' => 'Backend Error: ' . $e->getMessage()], 500);
        }
    }

    public function exportGroupLedger(Request $request, $groupId)
    {
        try {
            $request->validate([
                'start_date' => 'required|date',
                'end_date' => 'required|date|after_or_equal:start_date',
            ]);

            $user = Auth::user();
            $groupCheck = $user->groups()->where('group_id', $groupId)->first();

            if (!$groupCheck || $groupCheck->pivot->status !== 'approved') {
                return response()->json(['status' => 'error', 'message' => 'Unauthorized access to group ledger.'], 403);
            }

            $transactions = \App\Models\Transaction::with('user:id,name')
                ->where('group_id', $groupId)
                ->whereDate('transaction_date', '>=', $request->start_date)
                ->whereDate('transaction_date', '<=', $request->end_date)
                ->orderBy('transaction_date', 'asc') 
                ->get();

            return response()->json([
                'status' => 'success',
                'transactions' => $transactions
            ], 200);

        } catch (\Exception $e) {
            return response()->json(['status' => 'error', 'message' => 'Export failed: ' . $e->getMessage()], 500);
        }
    }

    public function chargePenalty(Request $request, $groupId)
    {
        try {
            $request->validate([
                'user_id' => 'required|exists:users,id',
                'amount' => 'required|numeric|min:1',
                'reason' => 'required|string|max:255'
            ]);

            $admin = Auth::user();
            $isAdmin = $admin->groups()
                             ->where('group_id', $groupId)
                             ->wherePivot('role', 'admin')
                             ->exists();

            if (!$isAdmin) {
                return response()->json(['status' => 'error', 'message' => 'Unauthorized.'], 403);
            }

            $transaction = \App\Models\Transaction::create([
                'user_id' => $request->user_id,
                'group_id' => $groupId,
                'amount' => $request->amount,
                'type' => 'deposit', 
                'method' => $request->reason, 
                'category' => 'penalty', 
                'transaction_date' => now()
            ]);

            $group = \App\Models\Group::find($groupId);

            AppNotification::create([
                'user_id' => $request->user_id,
                'group_id' => $groupId, 
                'title' => 'Fine/Penalty Charged',
                'message' => "You have been charged a fine of ₹{$request->amount} in {$group->name}. Reason: {$request->reason}."
            ]);

            return response()->json(['status' => 'success', 'message' => 'Penalty charged and added to Corpus!'], 200);

        } catch (\Throwable $e) {
            return response()->json(['status' => 'error', 'message' => 'Backend Error: ' . $e->getMessage()], 500);
        }
    }
    public function exportUserLedger(Request $request)
    {
        try {
            $request->validate([
                'start_date' => 'required|date',
                'end_date' => 'required|date|after_or_equal:start_date',
            ]);

            // Fetch transactions for THIS user, across ALL groups, within the dates
            $transactions = \App\Models\Transaction::with('group:id,name')
                ->where('user_id', Auth::id())
                ->whereDate('transaction_date', '>=', $request->start_date)
                ->whereDate('transaction_date', '<=', $request->end_date)
                ->orderBy('transaction_date', 'asc') 
                ->get();

            return response()->json([
                'status' => 'success',
                'transactions' => $transactions
            ], 200);

        } catch (\Exception $e) {
            return response()->json(['status' => 'error', 'message' => 'Export failed: ' . $e->getMessage()], 500);
        }
    }
}