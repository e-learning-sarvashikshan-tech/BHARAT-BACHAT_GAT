<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use App\Models\Transaction;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use App\Mail\OtpMail;

class AuthController extends Controller
{
    // 1. Send OTP
    public function sendOtp(Request $request)
    {
        // 1. Force Laravel to return JSON even if validation fails
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
            'phone' => 'nullable|digits:10',
            'name' => 'nullable|string',
            'password' => 'nullable|string|min:6'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation Error',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $user = User::where('email', $request->email)->first();

            if (!$user) {
                // Check if we are missing registration info
                if (!$request->name || !$request->phone || !$request->password) {
                    return response()->json([
                        'message' => 'New user! Please enter Name, Phone, and Password to register.'
                    ], 400); 
                }

                // Check for duplicate phone
                if (User::where('phone', $request->phone)->exists()) {
                    return response()->json(['message' => 'This mobile number is already registered.'], 409);
                }

                $user = User::create([
                    'name' => $request->name,
                    'email' => $request->email,
                    'phone' => $request->phone,
                    'password' => Hash::make($request->password),
                ]);
            }

            $otp = rand(1000, 9999);
            $user->otp_code = $otp; 
            $user->save();
            Log::info('Attempting to send OTP to: ' . $user->email);
            Mail::to($user->email)->send(new OtpMail($otp));
            Log::info('Mail function executed.');
             
            return response()->json([
                'message' => 'OTP generated successfully',
                'debug_otp' => $otp 
            ], 200);

        } catch (\Exception $e) {
            // This catches database errors (like missing columns)
            return response()->json([
                'message' => 'Server Error: ' . $e->getMessage()
            ], 500);
        }
    }

    // 2. VERIFY OTP
    public function verifyOtp(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'otp' => 'required',
            'language' => 'nullable'
        ]);

        $user = User::where('email', $request->email)->first();

        // Security check: Match OTP
        if (!$user || $user->otp_code != $request->otp) {
            Log::warning('Failed OTP attempt for: ' . $request->email);
            return response()->json(['message' => 'Invalid or expired OTP'], 401);
        }

        // Clear OTP code to prevent reuse
        $user->otp_code = null;

        // Save language preference if provided
        if($request->language) {
            $user->language_pref = $request->language;
        }

        $user->save();

        // Generate Sanctum Access Token
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'OTP Login successful',
            'access_token' => $token,
            'user' => $user
        ], 200);
    }

    // 3. LOGIN WITH PASSWORD
    public function loginWithPassword(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required'
        ]);

        $user = User::where('email', $request->email)->first();

        // Check user existence and verify hashed password
        if (!$user || !Hash::check($request->password, $user->password)) {
            Log::warning('Failed password login attempt: ' . $request->email);
            return response()->json(['message' => 'Invalid email or password'], 401);
        }

        // Generate Sanctum Access Token
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Password login successful',
            'access_token' => $token,
            'user' => $user
        ]);
    }

    // 4. MEMBER MANAGEMENT
    public function getMembers()
    {
        // Return all registered users (In a real app, filter by Group ID)
        $members = User::all();
        return response()->json($members, 200);
    }

    public function addMember(Request $request)
    {
        $request->validate([
            'name' => 'required|string',
            'phone' => 'required|digits:10|unique:users,phone',
            'email' => 'required|email|unique:users,email'
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'phone' => $request->phone,
            'password' => Hash::make('123456'), 
        ]);

        return response()->json([
            'message' => 'Member added successfully!', 
            'user' => $user
        ], 201);
    }

    public function removeMember($id)
    {
        $user = User::find($id);

        if (!$user) {
            return response()->json(['message' => 'Member not found'], 404);
        }
        
        $user->delete();
        Log::info('Member removed: ' . $id);

        return response()->json(['message' => 'Member removed successfully']);
    }

    // 5. DASHBOARD & TRANSACTIONS
    public function depositSavings(Request $request)
    {
        $request->validate([
            'amount' => 'required|numeric|min:1',
            'date' => 'required|date'
        ]);

        // Create new transaction record linked to logged-in user
        $transaction = new Transaction();
        $transaction->user_id = $request->user()->id;
        $transaction->type = 'deposit'; // Standardized to 'deposit'
        $transaction->amount = $request->amount;
        $transaction->transaction_date = $request->date;
        $transaction->status = 'success';
        $transaction->save();

        return response()->json([
            'message' => 'Savings deposited successfully!', 
            'data' => $transaction
        ], 200);
    }

    // --- UPDATED DASHBOARD STATS ---
    public function getDashboardStats(Request $request)
    {
        try {
            $user = $request->user();

            // 1. Calculate True Personal Savings (All Groups)
            // We check for both 'credit' and 'deposit' to support older test data
            $totalDeposits = Transaction::where('user_id', $user->id)->whereIn('type', ['credit', 'deposit'])->sum('amount');
            $totalWithdrawals = Transaction::where('user_id', $user->id)->where('type', 'withdrawal')->sum('amount');
            $trueSavings = $totalDeposits - $totalWithdrawals;

            // 2. Fetch User's Groups
            $groups = $user->groups()->get();

            // 3. Fetch Recent Transactions WITH Group Names!
            $recentTransactions = Transaction::with('group:id,name')
                                             ->where('user_id', $user->id)
                                             ->orderBy('transaction_date', 'desc')
                                             ->take(5)
                                             ->get();

            return response()->json([
                'total_savings' => $trueSavings,
                'groups' => $groups,
                'recent_transactions' => $recentTransactions
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Dashboard Error: ' . $e->getMessage()
            ], 500);
        }
    }
}