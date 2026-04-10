<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Group;
use App\Models\Transaction; 
use App\Models\Loan; 
use Illuminate\Support\Facades\Auth;

class GroupController extends Controller
{
    public function dashboard()
    {
        $user = Auth::user()->load('groups');

        $totalDeposits = Transaction::where('user_id', $user->id)
                            ->whereIn('type', ['deposit', 'credit', 'Deposit', 'Credit'])
                            ->where(function($query) {
                                $query->where('category', 'savings')
                                      ->orWhereNull('category')
                                      ->orWhere('category', '');
                            })
                            ->sum('amount');
                            
        $totalWithdrawals = Transaction::where('user_id', $user->id)
                            ->whereIn('type', ['withdrawal', 'Withdrawal'])
                            ->where(function($query) {
                                $query->where('category', 'savings')
                                      ->orWhereNull('category')
                                      ->orWhere('category', '');
                            })
                            ->sum('amount');
                            
        $liveBalance = $totalDeposits - $totalWithdrawals;

        $recentTransactions = Transaction::with('group:id,name')
                            ->where('user_id', $user->id)
                            ->orderBy('id', 'desc')
                            ->take(5)
                            ->get();

        $personalLoans = Loan::with('group:id,name')
                            ->where('user_id', $user->id)
                            ->whereIn('status', ['approved', 'active'])
                            ->get();

        return response()->json([
            'status' => 'success',
            'user' => $user,
            'total_savings' => $liveBalance, 
            'recent_transactions' => $recentTransactions,
            'personal_loans' => $personalLoans, 
            'groups' => $user->groups, 
            'message' => 'Dashboard data loaded successfully.'
        ], 200);
    }

    public function createGroup(Request $request) 
    {
        try {
            $request->validate([
                'name' => 'required|string|max:255',
                'monthly_contribution' => 'nullable|numeric|min:0'
            ]);

            $cleanName = trim($request->name);
            $nameExists = \App\Models\Group::whereRaw('LOWER(name) = ?', [strtolower($cleanName)])->exists();

            if ($nameExists) {
                return response()->json([
                    'status' => 'error',
                    'message' => "A group named '{$cleanName}' already exists. Please choose a unique name."
                ], 409); 
            }

            $group = \App\Models\Group::create([
                'name' => $cleanName,
                'monthly_contribution' => $request->monthly_contribution ?? 500,
                'meeting_day' => $request->meeting_day ?? 5,
                'created_by' => Auth::id(),
                'invite_code' => strtoupper(substr(uniqid(), -6)) 
            ]);

            $user = Auth::user();
            $user->groups()->attach($group->id, [
                'role' => 'admin',
                'status' => 'approved'
            ]);

            return response()->json([
                'status' => 'success',
                'message' => 'Group created successfully!',
                'group' => $group
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
              'status' => 'error',
              'message' => 'Failed to create group. ' . $e->getMessage() 
            ], 500);
        } 
    }

    public function joinGroup(Request $request) 
    {
        try {
            $request->validate([
                'invite_code' => 'required|string'
            ]);

            $group = \App\Models\Group::where('invite_code', strtoupper(trim($request->invite_code)))->first();

            if (!$group) {
                return response()->json([
                    'status' => 'error', 
                    'message' => 'Invalid Invite Code. Please check and try again.'
                ], 404);
            }

            $user = Auth::user();
            if ($user->groups()->where('group_id', $group->id)->exists()) {
                return response()->json([
                    'status' => 'error', 
                    'message' => 'You are already a member of this group.'
                ], 400);
            }

            $user->groups()->attach($group->id, [
                'role' => 'member',
                'status' => 'pending'
            ]);

            return response()->json([
                'status' => 'success',
                'message' => 'Successfully requested to join! Please wait for admin approval.',
                'group' => $group
            ], 200);

        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error("Join Group Error: " . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to join group. ' . $e->getMessage()
            ], 500);
        }
    }

    public function getGroupDetails($id)
    {
        try {
            $user = Auth::user();

            $groupPivot = $user->groups()->where('group_id', $id)->first();

            if (!$groupPivot) {
                return response()->json(['status' => 'error', 'message' => 'Unauthorized. You are not a member of this group.'], 403);
            }

            if ($groupPivot->pivot->status !== 'approved') {
                return response()->json(['status' => 'error', 'message' => 'Access Denied. Your membership is still pending admin approval.'], 403);
            }

            // --- THE FIX: ADDED profile_photo_url AND email_verified_at TO THE SELECT ---
            $group = \App\Models\Group::with(['users' => function($query) {
                $query->select('users.id', 'users.name', 'users.email', 'users.phone', 'users.profile_photo_url', 'users.email_verified_at'); 
            }])->find($id);

            $totalDeposits = \App\Models\Transaction::where('group_id', $id)->whereIn('type', ['deposit', 'Deposit', 'credit', 'Credit'])->sum('amount');
            $totalWithdrawals = \App\Models\Transaction::where('group_id', $id)->whereIn('type', ['withdrawal', 'Withdrawal'])->sum('amount');
            $groupBalance = $totalDeposits - $totalWithdrawals;

            $currentMonth = now()->month;
            $currentYear = now()->year;

            $approvedMembers = $group->users->filter(function($u) { return $u->pivot->status === 'approved'; })->values();
            
            $membersWithStatus = $approvedMembers->map(function ($member) use ($id, $currentMonth, $currentYear, $group) {
                $monthDeposits = \App\Models\Transaction::where('group_id', $id)
                    ->where('user_id', $member->id)
                    ->where(function($q) {
                        $q->where('category', 'savings')->orWhereNull('category')->orWhere('category', '');
                    })
                    ->whereIn('type', ['deposit', 'Deposit', 'credit', 'Credit'])
                    ->whereMonth('transaction_date', $currentMonth)
                    ->whereYear('transaction_date', $currentYear)
                    ->sum('amount');

                $hasPaid = $monthDeposits >= $group->monthly_contribution;
                
                $member->current_month_paid = $monthDeposits;
                $member->installment_status = $hasPaid ? 'Paid' : 'Pending';
                
                return $member;
            });

            $pendingMembers = $group->users->filter(function($u) { return $u->pivot->status === 'pending'; })->values();

            $recentTransactions = \App\Models\Transaction::with('user:id,name')
                ->where('group_id', $id)
                ->orderBy('id', 'desc')
                ->take(10)
                ->get();

            $activeLoansCount = \App\Models\Loan::where('group_id', $id)
                                    ->whereIn('status', ['approved', 'active'])
                                    ->count();

            $pendingLoansCount = \App\Models\Loan::where('group_id', $id)
                                    ->where('status', 'pending')
                                    ->count();

            return response()->json([
                'status' => 'success',
                'group' => $group,
                'group_balance' => $groupBalance,
                'members_status' => $membersWithStatus,
                'pending_members' => $pendingMembers,
                'recent_transactions' => $recentTransactions,
                'active_loans_count' => $activeLoansCount,      
                'pending_loans_count' => $pendingLoansCount,    
                'current_month_name' => now()->format('F Y') 
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to load group details. ' . $e->getMessage()
            ], 500);
        }
    }

    public function approveMember($groupId, $userId)
    {
        try {
            $admin = Auth::user();
            $adminCheck = $admin->groups()->wherePivot('role', 'admin')->find($groupId);

            if (!$adminCheck) {
                return response()->json(['status' => 'error', 'message' => 'Unauthorized. Only group admins can approve members.'], 403);
            }

            $targetUser = \App\Models\User::find($userId);
            
            if ($targetUser && $targetUser->groups()->find($groupId)) {
                $targetUser->groups()->updateExistingPivot($groupId, ['status' => 'approved']);
                return response()->json(['status' => 'success', 'message' => 'Member approved successfully.'], 200);
            }

            return response()->json(['status' => 'error', 'message' => 'User not found in this group.'], 404);
        } catch (\Exception $e) {
            return response()->json(['status' => 'error', 'message' => 'Failed to approve member. ' . $e->getMessage()], 500);
        }
    }

    public function promoteMember($groupId, $userId)
    {
        try {
            $admin = Auth::user();
            $adminCheck = $admin->groups()->wherePivot('role', 'admin')->find($groupId);

            if (!$adminCheck) {
                return response()->json(['status' => 'error', 'message' => 'Unauthorized. Only group admins can promote members.'], 403);
            }

            $targetUser = \App\Models\User::find($userId);
            
            if ($targetUser && $targetUser->groups()->find($groupId)) {
                $targetUser->groups()->updateExistingPivot($groupId, ['role' => 'admin']);
                return response()->json(['status' => 'success', 'message' => 'Member promoted to Admin successfully!'], 200);
            }

            return response()->json(['status' => 'error', 'message' => 'User not found in this group.'], 404);
        } catch (\Exception $e) {
            return response()->json(['status' => 'error', 'message' => 'Failed to promote member. ' . $e->getMessage()], 500);
        }
    }

    public function demoteMember($groupId, $userId)
    {
        try {
            $admin = Auth::user();
            $adminCheck = $admin->groups()->wherePivot('role', 'admin')->find($groupId);

            if (!$adminCheck) {
                return response()->json(['status' => 'error', 'message' => 'Unauthorized.'], 403);
            }

            $group = \App\Models\Group::find($groupId);
            
            if ($group->created_by == $userId) {
                return response()->json(['status' => 'error', 'message' => 'The Group Creator cannot be demoted.'], 403);
            }

            $targetUser = \App\Models\User::find($userId);
            if ($targetUser && $targetUser->groups()->find($groupId)) {
                $targetUser->groups()->updateExistingPivot($groupId, ['role' => 'member']);
                return response()->json(['status' => 'success', 'message' => 'Admin demoted to Member.'], 200);
            }

            return response()->json(['status' => 'error', 'message' => 'User not found.'], 404);
        } catch (\Exception $e) {
            return response()->json(['status' => 'error', 'message' => 'Failed to demote. ' . $e->getMessage()], 500);
        }
    }

    public function removeMember($groupId, $userId)
    {
        try {
            $admin = Auth::user();
            $adminCheck = $admin->groups()->wherePivot('role', 'admin')->find($groupId);

            if (!$adminCheck) {
                return response()->json(['status' => 'error', 'message' => 'Unauthorized.'], 403);
            }

            $group = \App\Models\Group::find($groupId);
            
            if ($group->created_by == $userId) {
                return response()->json(['status' => 'error', 'message' => 'The Group Creator cannot be removed.'], 403);
            }

            $targetUser = \App\Models\User::find($userId);
            if ($targetUser && $targetUser->groups()->find($groupId)) {
                $targetUser->groups()->detach($groupId);
                return response()->json(['status' => 'success', 'message' => 'Member removed from the group.'], 200);
            }

            return response()->json(['status' => 'error', 'message' => 'User not found.'], 404);
        } catch (\Exception $e) {
            return response()->json(['status' => 'error', 'message' => 'Failed to remove member. ' . $e->getMessage()], 500);
        }
    }

    public function addMemberManually(Request $request)
    {
        try {
            $validated = $request->validate([
                'group_id' => 'required|exists:groups,id',
                'name' => 'required|string|max:255',
                'phone' => ['required', 'regex:/^[6-9]\d{9}$/'], 
                'email' => 'nullable|email', 
            ]);

            $user = \App\Models\User::where('phone', $validated['phone'])->first();

            if (!$user) {
                $dummyEmail = $validated['email'] ?? $validated['phone'] . '@offline.bharatbachat.in';

                $user = \App\Models\User::create([
                    'name' => $validated['name'],
                    'email' => $dummyEmail,
                    'phone' => $validated['phone'],
                    'password' => bcrypt(uniqid('pass_')), 
                ]);
            }

            $group = \App\Models\Group::findOrFail($validated['group_id']);
            
            if ($group->users()->where('user_id', $user->id)->exists()) {
                return response()->json([
                    'status' => 'error', 
                    'message' => 'This user is already a member of this Gat.'
                ], 409); 
            }

            $group->users()->attach($user->id, [
                'role' => 'member', 
                'status' => 'approved', 
            ]);

            return response()->json([
                'status' => 'success', 
                'message' => "{$user->name} was successfully added to the Gat!"
            ], 200);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'status' => 'error', 
                'message' => 'Invalid phone number. Please enter a valid 10-digit mobile number.'
            ], 422);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error("Add Member Error: " . $e->getMessage());
            return response()->json(['status' => 'error', 'message' => 'Failed to add member.'], 500);
        }
    }

    public function getCorpusStats($groupId)
    {
        try {
            $user = Auth::user();
            $groupPivot = $user->groups()->where('group_id', $groupId)->first();

            if (!$groupPivot || $groupPivot->pivot->status !== 'approved') {
                return response()->json(['status' => 'error', 'message' => 'Unauthorized access to group funds.'], 403);
            }

            $totalDeposits = \App\Models\Transaction::where('group_id', $groupId)
                                ->whereIn('type', ['deposit', 'Deposit', 'credit', 'Credit'])
                                ->sum('amount');
            
            $totalWithdrawals = \App\Models\Transaction::where('group_id', $groupId)
                                ->whereIn('type', ['withdrawal', 'Withdrawal'])
                                ->sum('amount');

            $liveCorpus = $totalDeposits - $totalWithdrawals;

            $activeLoans = \App\Models\Loan::where('group_id', $groupId)
                                ->where('status', 'approved')
                                ->get();
            
            $totalGivenOut = $activeLoans->sum('principal_amount');
            $totalRepaidSoFar = $activeLoans->sum('amount_paid');
            $outstandingLoans = $totalGivenOut - $totalRepaidSoFar;

            $totalGroupValue = $liveCorpus + $outstandingLoans;

            return response()->json([
                'status' => 'success',
                'data' => [
                    'total_deposits' => $totalDeposits,
                    'total_withdrawals' => $totalWithdrawals,
                    'live_corpus' => $liveCorpus,
                    'outstanding_loans' => $outstandingLoans,
                    'total_group_value' => $totalGroupValue
                ]
            ], 200);

        } catch (\Exception $e) {
            return response()->json(['status' => 'error', 'message' => 'Failed to calculate corpus: ' . $e->getMessage()], 500);
        }
    }

    public function getPersonalPortfolio()
    {
        try {
            $user = Auth::user();
            $groups = $user->groups()->wherePivot('status', 'approved')->get();
            
            $portfolio = [];
            $totalInvested = 0;

            foreach ($groups as $group) {
                $userDeposits = \App\Models\Transaction::where('group_id', $group->id)
                                    ->where('user_id', $user->id)
                                    ->whereIn('type', ['deposit', 'credit', 'Deposit', 'Credit']) 
                                    ->where(function($q) {
                                        $q->where('category', 'savings')
                                          ->orWhereNull('category')
                                          ->orWhere('category', '');
                                    })
                                    ->sum('amount');
                                    
                $userWithdrawals = \App\Models\Transaction::where('group_id', $group->id)
                                    ->where('user_id', $user->id)
                                    ->whereIn('type', ['withdrawal', 'Withdrawal'])
                                    ->where(function($q) {
                                        $q->where('category', 'savings')
                                          ->orWhereNull('category')
                                          ->orWhere('category', '');
                                    })
                                    ->sum('amount');

                $netInvestment = $userDeposits - $userWithdrawals;

                if ($netInvestment > 0) {
                    $portfolio[] = [
                        'group_id' => $group->id,
                        'group_name' => $group->name,
                        'amount_invested' => $netInvestment,
                        'role' => $group->pivot->role 
                    ];
                    $totalInvested += $netInvestment;
                }
            }

            return response()->json([
                'status' => 'success',
                'data' => [
                    'total_invested' => $totalInvested,
                    'distribution' => $portfolio
                ]
            ], 200);

        } catch (\Exception $e) {
            return response()->json(['status' => 'error', 'message' => 'Failed to load portfolio.'], 500);
        }
    }
    
    public function deleteGroup(Request $request, $id)
    {
        try {
            $user = $request->user();
            $group = \App\Models\Group::find($id);

            if (!$group) {
                return response()->json(['message' => 'Group not found'], 404);
            }

            $isAdmin = $group->users()->where('user_id', $user->id)->wherePivot('role', 'admin')->exists();
            
            if (!$isAdmin) {
                return response()->json(['message' => 'Only Group Admins can delete a Bachat Gat.'], 403);
            }

            $activeLoans = \App\Models\Loan::where('group_id', $id)
                                ->whereIn('status', ['pending', 'active', 'approved'])
                                ->count();

            if ($activeLoans > 0) {
                return response()->json([
                    'message' => 'Cannot delete group. There are still active or pending loans that must be settled first.'
                ], 400);
            }

            $group->delete();

            return response()->json([
                'status' => 'success',
                'message' => 'Group permanently deleted.'
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to delete group: ' . $e->getMessage()
            ], 500);
        }
    }
}