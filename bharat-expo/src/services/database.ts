import * as SQLite from 'expo-sqlite';

// 1. Using v2 to force your phone to create the missing tables from scratch
const db = SQLite.openDatabaseSync('bharat_bachat_v4.db');

export const initDatabase = async () => {
  try {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      
      -- Existing transactions table (Updated with group_id for multi-gat support)
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        group_id INTEGER,
        type TEXT,
        amount REAL,
        date TEXT,
        method TEXT,
        synced INTEGER DEFAULT 0
      );

      -- NEW: Attendance Table (This was missing from your previous file!)
      CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        group_id INTEGER,
        meeting_date TEXT,
        attendance_data TEXT, 
        synced INTEGER DEFAULT 0
      );

      -- NEW: Meeting Minutes table (Combined new multi-gat fields with your old legacy fields)
      CREATE TABLE IF NOT EXISTS meeting_minutes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        group_id INTEGER,
        meeting_date TEXT,
        minutes_text TEXT,
        title TEXT,
        date TEXT,
        content TEXT,
        synced INTEGER DEFAULT 0
      );
    `);
    console.log("SQLite: Bharat Bachat Offline Vault is ready!");
  } catch (error) {
    console.error("SQLite Initialization Error:", error);
  }
};

// ==========================================
// NEW SPRINT 6 FUNCTIONS (Multi-Tenant Offline Sync)
// ==========================================

export const saveOfflineAttendance = async (groupId: number, meetingDate: string, attendanceData: any) => {
  try {
    const stringifiedData = JSON.stringify(attendanceData);
    await db.runAsync(
      'INSERT INTO attendance (group_id, meeting_date, attendance_data, synced) VALUES (?, ?, ?, 0)',
      [groupId, meetingDate, stringifiedData]
    );
    console.log("SQLite: Attendance saved securely to local vault.");
    return true;
  } catch (error) {
    console.error("Error saving offline attendance:", error);
    return false;
  }
};

export const saveOfflineMinutes = async (groupId: number, meetingDate: string, minutesText: string) => {
  try {
    await db.runAsync(
      'INSERT INTO meeting_minutes (group_id, meeting_date, minutes_text, synced) VALUES (?, ?, ?, 0)',
      [groupId, meetingDate, minutesText]
    );
    console.log("SQLite: Minutes saved securely to local vault.");
    return true;
  } catch (error) {
    console.error("Error saving offline minutes:", error);
    return false;
  }
};

export const getUnsyncedAttendance = async () => {
  try {
    return await db.getAllAsync('SELECT * FROM attendance WHERE synced = 0');
  } catch (error) {
    console.error("SQLite Fetch Attendance Error:", error);
    return [];
  }
};

export const markAttendanceSynced = async (id: number) => {
  try {
    await db.runAsync('UPDATE attendance SET synced = 1 WHERE id = ?', [id]);
  } catch (error) {
    console.error("SQLite Mark Attendance Synced Error:", error);
  }
};

export const getUnsyncedMinutes = async () => {
  try {
    return await db.getAllAsync('SELECT * FROM meeting_minutes WHERE synced = 0');
  } catch (error) {
    console.error("SQLite Fetch Minutes Error:", error);
    return [];
  }
};

export const markMinutesSynced = async (id: number) => {
  try {
    await db.runAsync('UPDATE meeting_minutes SET synced = 1 WHERE id = ?', [id]);
  } catch (error) {
    console.error("SQLite Mark Minutes Synced Error:", error);
  }
};


// ==========================================
// YOUR LEGACY FUNCTIONS (Kept safe so your old screens don't crash)
// ==========================================

export const saveMeetingMinutes = async (title: string, content: string) => {
  try {
    const date = new Date().toISOString();
    await db.runAsync(
      'INSERT INTO meeting_minutes (title, date, content) VALUES (?, ?, ?)',
      [title, date, content]
    );
    console.log(`SQLite: Saved Meeting Minutes: ${title}`);
    return true;
  } catch (error) {
    console.error("SQLite Save Minutes Error:", error);
    return false;
  }
};

export const deleteMeetingMinute = async (id: number) => {
  try {
    await db.runAsync('DELETE FROM meeting_minutes WHERE id = ?', [id]);
    console.log(`SQLite: Deleted Meeting Minute ID: ${id}`);
    return true;
  } catch (error) {
    console.error("SQLite Delete Minutes Error:", error);
    return false;
  }
};

export const updateMeetingMinute = async (id: number, title: string, content: string) => {
  try {
    await db.runAsync(
      'UPDATE meeting_minutes SET title = ?, content = ? WHERE id = ?',
      [title, content, id]
    );
    console.log(`SQLite: Updated Meeting Minute ID: ${id}`);
    return true;
  } catch (error) {
    console.error("SQLite Update Minutes Error:", error);
    return false;
  }
};

export const getMeetingMinutes = async () => {
  try {
    const allRows = await db.getAllAsync('SELECT * FROM meeting_minutes ORDER BY id DESC');
    return allRows;
  } catch (error) {
    console.error("SQLite Fetch Minutes Error:", error);
    return [];
  }
};

export const saveTransaction = async (userId: number, type: string, amount: number, method: string) => {
  try {
    const date = new Date().toISOString();
    await db.runAsync(
      'INSERT INTO transactions (user_id, type, amount, date, method, synced) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, type, amount, date, method, 0] 
    );
    console.log(`SQLite: Saved ${type} of ₹${amount} locally!`);
    return true;
  } catch (error) {
    console.error("SQLite Save Error:", error);
    return false;
  }
};

export const getLocalTransactions = async () => {
  try {
    const allRows = await db.getAllAsync('SELECT * FROM transactions ORDER BY date DESC');
    return allRows;
  } catch (error) {
    console.error("SQLite Fetch Error:", error);
    return [];
  }
};

export const getUnsyncedTransactions = async () => {
  try {
    return await db.getAllAsync('SELECT * FROM transactions WHERE synced = 0');
  } catch (error) {
    return [];
  }
};

export const markAsSynced = async (id: number) => {
  try {
    await db.runAsync('UPDATE transactions SET synced = 1 WHERE id = ?', [id]);
  } catch (error) {
    console.error("Failed to mark as synced", error);
  }
};

export default db;