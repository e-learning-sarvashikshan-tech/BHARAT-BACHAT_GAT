<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use App\Models\Transaction;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class AuthController extends Controller
{
    /**
     * 1. SEND OTP
     * This function handles both login for existing users 
     * and registration for new users.
     * * For New Users: Requires Name, Phone, and Password.
     * For Existing: Requires only Email.
     */
    public function sendOtp(Request $request)
    {
        Log::info('OTP Request received for: ' . $request->email);

        $request->validate([
            'email' => 'required|email',
            'phone' => 'nullable|digits:10',
            'name' => 'nullable|string',
            'password' => 'nullable|string|min:6'
        ]);

        $user = User::where('email', $request->email)->first();

        // LOGIC FOR NEW USER REGISTRATION
        if (!$user) {
            Log::info('New user detected. Attempting registration...');

            if (!$request->name || !$request->phone || !$request->password) {
                return response()->json([
                    'message' => 'New user detected. Name, Phone, and Password are required.'
                ], 422);
            }

            // Ensure the mobile number is unique in the database
            if (User::where('phone', $request->phone)->exists()) {
                return response()->json([
                    'message' => 'This mobile number is already registered with another account.'
                ], 422);
            }

            // Create the user record with a hashed password
            $user = User::create([
                'name' => $request->name,
                'email' => $request->email,
                'phone' => $request->phone,
                'password' => Hash::make($request->password), 
            ]);

            Log::info('User created successfully: ' . $user->id);
        }

        // Generate a 4-digit random OTP
        $otp = rand(1000, 9999);
        $user->otp_code = $otp; 
        $user->save();

        return response()->json([
            'message' => 'OTP generated successfully',
            'debug_otp' => $otp 
        ]);
    }

    /**
     * 2. VERIFY OTP
     * Validates the 4-digit code and returns a Bearer Token.
     */
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

    /**
     * 3. LOGIN WITH PASSWORD
     * Allows users to bypass OTP by using their set password.
     */
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

    /**
     * 4. MEMBER MANAGEMENT
     * Functions to manage the Bachat Gat community members.
     */
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
            'password' => Hash::make('123456'), // Default password for manual entries
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

    /**
     * 5. DASHBOARD & TRANSACTIONS
     * Handles the financial records of the user.
     */
    public function depositSavings(Request $request)
    {
        $request->validate([
            'amount' => 'required|numeric|min:1',
            'date' => 'required|date'
        ]);

        // Create new transaction record linked to logged-in user
        $transaction = new Transaction();
        $transaction->user_id = $request->user()->id;
        $transaction->type = 'credit';
        $transaction->amount = $request->amount;
        $transaction->transaction_date = $request->date;
        $transaction->status = 'success';
        $transaction->save();

        return response()->json([
            'message' => 'Savings deposited successfully!', 
            'data' => $transaction
        ], 200);
    }

    public function getDashboardStats(Request $request)
    {
        $user = $request->user();

        // 1. Calculate sum of all credit transactions
        $totalSavings = Transaction::where('user_id', $user->id)
                                    ->where('type', 'credit')
                                    ->sum('amount');

        // 2. Fetch the 5 most recent transactions for history
        $recentTransactions = Transaction::where('user_id', $user->id)
                                          ->orderBy('created_at', 'desc')
                                          ->take(5)
                                          ->get();

        return response()->json([
            'total_savings' => $totalSavings,
            'recent_transactions' => $recentTransactions
        ], 200);
    }
}