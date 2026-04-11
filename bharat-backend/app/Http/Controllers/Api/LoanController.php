<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Loan;
use App\Models\Group;
use App\Models\Transaction;
use App\Models\AppNotification; 
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class LoanController extends Controller
{
    public function getGroupLoans($groupId)
    {
        try {
            $loans = Loan::with(['user:id,name', 'approver:id,name'])
                         ->where('group_id', $groupId)
                         ->orderBy('created_at', 'desc')
                         ->get();

            return response()->json([
                'status' => 'success',
                'data' => [
                    'pending' => $loans->where('status', 'pending')->values(),
                    'active' => $loans->where('status', 'approved')->values(),
                    'completed' => $loans->where('status', 'completed')->values(),
                    'rejected' => $loans->where('status', 'rejected')->values(),
                ]
            ], 200);
        } catch (\Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    public function requestLoan(Request $request, $groupId)
    {
        // --- UPGRADED: NOW ACCEPTS PROPOSED INTEREST RATE ---
        $request->validate([
            'principal_amount' => 'required|numeric|min:100',
            'duration_months' => 'required|integer|min:1',
            'proposed_interest_rate' => 'nullable|numeric|min:0' 
        ]);

        $user = Auth::user();
        
        if (!$user->groups()->where('group_id', $groupId)->exists()) {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized'], 403);
        }

        $group = Group::findOrFail($groupId);

        // Determine if they sent a custom rate, otherwise fallback to group default
        $interestRateToSave = $request->has('proposed_interest_rate') && $request->proposed_interest_rate !== null 
            ? $request->proposed_interest_rate 
            : ($group->interest_rate ?? 2.0);

        $loan = Loan::create([
            'user_id' => $user->id,
            'group_id' => $groupId,
            'principal_amount' => $request->principal_amount,
            'interest_rate' => $interestRateToSave,
            'duration_months' => $request->duration_months,
            'status' => 'pending'
        ]);

        AppNotification::create([
            'user_id' => $user->id,
            'title' => 'Loan Requested',
            'message' => "Your loan request for ₹{$request->principal_amount} has been successfully submitted to the Gat Pramukh."
        ]);

        return response()->json(['status' => 'success', 'message' => 'Loan request submitted!', 'loan' => $loan]);
    }

    public function approveLoan(Request $request, $groupId, $loanId)
    {
        $admin = Auth::user();
        $isAdmin = $admin->groups()->where('group_id', $groupId)->wherePivot('role', 'admin')->exists();
        
        if (!$isAdmin) {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized. Only admins can approve loans.'], 403);
        }

        $request->validate(['interest_rate' => 'nullable|numeric|min:0']);

        return DB::transaction(function () use ($request, $groupId, $loanId, $admin) {
            $loan = Loan::where('group_id', $groupId)->lockForUpdate()->findOrFail($loanId);
            
            if ($loan->status !== 'pending') {
                return response()->json(['status' => 'error', 'message' => 'Loan is not pending.'], 400);
            }

            $totalDeposits = Transaction::where('group_id', $groupId)->where('type', 'deposit')->sum('amount');
            $totalWithdrawals = Transaction::where('group_id', $groupId)->where('type', 'withdrawal')->sum('amount');
            $totalBalance = $totalDeposits - $totalWithdrawals;

            if ($totalBalance < $loan->principal_amount) {
                return response()->json(['status' => 'error', 'message' => 'Insufficient group funds.'], 400);
            }

            $finalInterestRate = $request->input('interest_rate', $loan->interest_rate);

            $loan->update([
                'status' => 'approved',
                'interest_rate' => $finalInterestRate,
                'approved_by' => $admin->id, 
                'approved_at' => now()
            ]);

            Transaction::create([
                'user_id' => $loan->user_id, 
                'group_id' => $groupId,
                'amount' => $loan->principal_amount,
                'type' => 'withdrawal',
                'method' => 'cash', 
                'category' => 'loan_disbursement', 
                'transaction_date' => now()
            ]);

            AppNotification::create([
                'user_id' => $loan->user_id,
                'title' => 'Loan Approved!',
                'message' => "Your loan of ₹{$loan->principal_amount} has been approved with an interest rate of {$finalInterestRate}%."
            ]);

            return response()->json(['status' => 'success', 'message' => 'Loan disbursed with an interest rate of ' . $finalInterestRate . '%!']);
        });
    }
        
    public function rejectLoan(Request $request, $groupId, $loanId)
    {
        $admin = Auth::user();
        $isAdmin = $admin->groups()->where('group_id', $groupId)->wherePivot('role', 'admin')->exists();
        
        if (!$isAdmin) {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized. Only admins can reject loans.'], 403);
        }

        $request->validate(['rejection_reason' => 'required|string|max:255']);
        
        $loan = Loan::where('group_id', $groupId)->findOrFail($loanId);
        
        if ($loan->status !== 'pending') {
            return response()->json(['status' => 'error', 'message' => 'Only pending loans can be rejected.'], 400);
        }

        $loan->update([
            'status' => 'rejected',
            'rejection_reason' => $request->rejection_reason,
            'approved_by' => $admin->id,
            'approved_at' => now()
        ]);

        AppNotification::create([
            'user_id' => $loan->user_id,
            'title' => 'Loan Rejected',
            'message' => "Your recent loan request was declined. Reason: {$request->rejection_reason}."
        ]);

        return response()->json(['status' => 'success', 'message' => 'Loan rejected.']);
    }

    public function repayLoan(Request $request, $loanId)
    {
        try {
            $request->validate(['amount' => 'required|numeric|min:1']);

            return DB::transaction(function () use ($request, $loanId) {
                $loan = Loan::lockForUpdate()->findOrFail($loanId);
                
                if ($loan->status !== 'approved' && $loan->status !== 'active') {
                    return response()->json(['status' => 'error', 'message' => 'Only active loans can be repaid.'], 400);
                }

                $duration = $loan->duration_months > 0 ? $loan->duration_months : 1; 

                $totalDue = $loan->principal_amount + ($loan->principal_amount * ($loan->interest_rate / 100) * $duration);
                $currentlyPaid = $loan->amount_paid ?? 0;
                $pendingBalance = $totalDue - $currentlyPaid;

                if ($request->amount > ceil($pendingBalance)) {
                    return response()->json([
                        'status' => 'error', 
                        'message' => 'Payment of ₹' . $request->amount . ' exceeds the pending balance of ₹' . ceil($pendingBalance) . '.'
                    ], 400);
                }

                Transaction::create([
                    'user_id' => $loan->user_id, 
                    'group_id' => $loan->group_id,
                    'amount' => $request->amount,
                    'type' => 'deposit',
                    'method' => 'cash', 
                    'category' => 'loan_repayment', 
                    'transaction_date' => now()
                ]);

                $loan->amount_paid += $request->amount;
                $newPendingBalance = ceil($totalDue - $loan->amount_paid);

                if ($loan->amount_paid >= $totalDue) {
                    $loan->status = 'completed';
                    
                    AppNotification::create([
                        'user_id' => $loan->user_id,
                        'title' => 'Loan Completed! 🎉',
                        'message' => "Congratulations! You have fully repaid your loan of ₹{$loan->principal_amount}."
                    ]);
                } else {
                    AppNotification::create([
                        'user_id' => $loan->user_id,
                        'title' => 'EMI Recorded',
                        'message' => "Your loan installment of ₹{$request->amount} was recorded successfully. Pending balance: ₹{$newPendingBalance}."
                    ]);
                }
                
                $loan->save();

                return response()->json(['status' => 'success', 'message' => 'Repayment recorded!']);
            });

        } catch (\Throwable $e) { 
            return response()->json(['status' => 'error', 'message' => 'Backend Error: ' . $e->getMessage()], 500);
        }
    }
    
    public function getAllUserLoans(Request $request)
{
    $user = $request->user();
    
    // Get all loans where the user is EITHER the borrower OR the admin of the group
    $loans = \App\Models\Loan::with(['user', 'group'])
        ->where('user_id', $user->id)
        ->orWhereHas('group', function ($query) use ($user) {
            $query->whereHas('users', function ($q) use ($user) {
                $q->where('user_id', $user->id)->where('role', 'admin');
            });
        })
        ->orderBy('created_at', 'desc')
        ->get();

    return response()->json([
        'status' => 'success',
        'data' => [
            'pending' => $loans->where('status', 'pending')->values(),
            'active' => $loans->where('status', 'active')->values(),
            'completed' => $loans->where('status', 'completed')->values(),
            'rejected' => $loans->where('status', 'rejected')->values(),
        ]
    ]);
}

}