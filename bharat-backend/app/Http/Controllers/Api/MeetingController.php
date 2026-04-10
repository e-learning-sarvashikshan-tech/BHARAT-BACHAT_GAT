<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use App\Models\Attendance;
use App\Models\MeetingRecord; 
use App\Models\AppNotification; // <-- ADDED
use App\Models\Group;           // <-- ADDED

class MeetingController extends Controller
{
    /**
     * Catches offline data from the React Native app and saves it to MySQL.
     * NOW INCLUDES SILENT SKIPPING AND NOTIFICATION BROADCASTING.
     */
    public function syncMinutes(Request $request)
    {
        try {
            $attendanceRecords = $request->input('attendance', []);
            $minutesRecords = $request->input('minutes', []);

            $attendanceSynced = 0;
            $attendanceSkipped = 0;
            $minutesSynced = 0;
            $minutesSkipped = 0;
            
            // Track which groups had new meetings synced so we can notify members
            $syncedMeetings = []; 

            // --- 1. PROCESS ATTENDANCE ---
            foreach ($attendanceRecords as $record) {
                $exists = Attendance::where('group_id', $record['group_id'])
                                    ->whereDate('meeting_date', $record['meeting_date'])
                                    ->exists();
                if (!$exists) {
                    $attendanceDataArray = is_string($record['attendance_data']) 
                        ? json_decode($record['attendance_data'], true) 
                        : $record['attendance_data'];

                    Attendance::create([
                        'group_id' => $record['group_id'],
                        'meeting_date' => $record['meeting_date'],
                        'attendance_data' => $attendanceDataArray
                    ]);
                    $attendanceSynced++;
                    // Log this meeting to trigger a notification later
                    $syncedMeetings[$record['group_id']][] = $record['meeting_date'];
                } else {
                    $attendanceSkipped++; 
                }
            }

            // --- 2. PROCESS MINUTES ---
            foreach ($minutesRecords as $record) {
                $exists = MeetingRecord::where('group_id', $record['group_id'])
                                       ->whereDate('meeting_date', $record['meeting_date'])
                                       ->exists();
                if (!$exists) {
                    MeetingRecord::create([
                        'group_id' => $record['group_id'],
                        'meeting_date' => $record['meeting_date'],
                        'minutes_text' => $record['minutes_text']
                    ]);
                    $minutesSynced++;
                    // Log this meeting to trigger a notification later (avoids duplicate tracking)
                    $syncedMeetings[$record['group_id']][] = $record['meeting_date'];
                } else {
                    $minutesSkipped++; 
                }
            }

            // --- 3. BROADCAST NOTIFICATIONS TO MEMBERS ---
            foreach ($syncedMeetings as $groupId => $dates) {
                $group = Group::with('users')->find($groupId);
                if ($group) {
                    // Clean up dates (e.g., if attendance AND minutes synced for the same day, only show date once)
                    $uniqueDates = array_unique($dates);
                    $dateString = implode(', ', $uniqueDates);

                    foreach ($group->users as $user) {
                        AppNotification::create([
                            'user_id' => $user->id,
                            'group_id' => $groupId, // <-- CRITICAL FOR ROUTING
                            'title' => 'Meeting Recorded',
                            'message' => "The official meeting records and attendance for {$dateString} in {$group->name} have been updated."
                        ]);
                    }
                }
            }

            Log::info("Sync complete. Attendance: $attendanceSynced saved. Minutes: $minutesSynced saved.");

            return response()->json([
                'status' => 'success',
                'message' => 'Sync processed. Notifications sent.'
            ], 200);

        } catch (\Exception $e) {
            Log::error("Sync Error: " . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to sync records.'
            ], 500);
        }
    }

    public function getHistory($groupId)
    {
        try {
            $minutes = MeetingRecord::where('group_id', $groupId)->get()->keyBy('meeting_date');
            $attendances = Attendance::where('group_id', $groupId)->get()->keyBy('meeting_date');

            $allDates = $minutes->keys()->merge($attendances->keys())->unique()->sortDesc()->values();

            $history = $allDates->map(function($date) use ($minutes, $attendances) {
                return [
                    'meeting_date' => $date,
                    'minutes_text' => $minutes->has($date) ? $minutes[$date]->minutes_text : null,
                    'attendance_data' => $attendances->has($date) ? $attendances[$date]->attendance_data : null,
                ];
            });

            return response()->json([
                'status' => 'success',
                'data' => $history
            ], 200);

        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error("History Fetch Error: " . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to fetch meeting history.'
            ], 500);
        }
    }
}