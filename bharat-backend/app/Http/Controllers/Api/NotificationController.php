<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\AppNotification;
use Illuminate\Support\Facades\Auth;

class NotificationController extends Controller
{
    public function getNotifications()
    {
        // THE FIX: We explicitly tell the database to pull the group_id column
        // so Laravel cannot accidentally hide it from the frontend.
        $notifications = AppNotification::select('id', 'user_id', 'group_id', 'title', 'message', 'is_read', 'created_at')
                                        ->where('user_id', Auth::id())
                                        ->orderBy('created_at', 'desc')
                                        ->get();

        $unreadCount = $notifications->where('is_read', false)->count();

        return response()->json([
            'status' => 'success',
            'unread_count' => $unreadCount,
            'notifications' => $notifications
        ], 200);
    }

    public function markAsRead()
    {
        AppNotification::where('user_id', Auth::id())
                       ->where('is_read', false)
                       ->update(['is_read' => true]);

        return response()->json(['status' => 'success']);
    }
}