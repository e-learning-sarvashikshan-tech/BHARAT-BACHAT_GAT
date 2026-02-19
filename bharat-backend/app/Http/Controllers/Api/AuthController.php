<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    // 1. Send OTP (Login or Register)
    public function sendOtp(Request $request)
    {
        $request->validate(['email' => 'required|email']);

        // Find user or create a new one
        $user = User::firstOrCreate(
            ['email' => $request->email],
            ['name' => 'New User', 'phone' => ''] // Default values
        );

        // Generate a 4-digit OTP
        $otp = rand(1000, 9999);
        $user->otp_code = $otp;
        $user->save();

        // In a real app, you would send an email here.
        // For development, we return the OTP in the response so you can see it.
        return response()->json([
            'message' => 'OTP sent successfully',
            'debug_otp' => $otp 
        ]);
    }

    // 2. Verify OTP
    public function verifyOtp(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'otp' => 'required',
            'language' => 'nullable'
        ]);

        // 1. Find the user by email ONLY
        $user = User::where('email', $request->email)->first();

        // 2. Check if user exists
        if (!$user) {
            return response()->json(['message' => 'User not found in database'], 404);
        }

        // 3. Compare the OTPs using PHP (!= allows string-to-number matching)
        if ($user->otp_code != $request->otp) {
            // DEBUGGING: This will show you exactly what is mismatched!
            return response()->json([
                'message' => 'Invalid OTP',
                'db_has' => $user->otp_code,
                'you_typed' => $request->otp
            ], 401);
        }

        // 4. Clear OTP after success
        $user->otp_code = null;
        if($request->language) {
            $user->language_pref = $request->language;
        }
        $user->save();

        // 5. Create a secure token for the app to use
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Login successful',
            'access_token' => $token,
            'user' => $user
        ], 200);

    }
    // 3. Get all Bachat Gat Members
    public function getMembers()
    {
        try {
            $members = User::all();
            return response()->json($members, 200);
            
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Server crashed while fetching members',
                'error' => $e->getMessage()
            ], 500);
        }
    }

} 