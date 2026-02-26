import * as SQLite from 'expo-sqlite';

// 1. Open (or create) the local Bharat Bachat database
// This file lives on the user's phone, not the server.
const db = SQLite.openDatabaseSync('bharat_bachat.db');

/**
 * Initializes the database tables.
 * This should be called in App.tsx when the app starts.
 */
export const initDatabase = async () => {
  try {
    // PRAGMA journal_mode = WAL improves performance for concurrent reads/writes.
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      
      -- Existing transactions table
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        type TEXT,
        amount REAL,
        date TEXT,
        method TEXT,
        synced INTEGER DEFAULT 0
      );

      -- NEW: Meeting Minutes table
      CREATE TABLE IF NOT EXISTS meeting_minutes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        date TEXT,
        content TEXT
      );
    `);
    console.log("SQLite: Bharat Bachat database and Meeting Minutes table are ready!");
  } catch (error) {
    console.error("SQLite Initialization Error:", error);
  }
};

/**
 * Saves meeting minutes locally.
 */
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

/**
 * Deletes a meeting record by ID.
 */
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

/**
 * Updates an existing meeting record.
 */
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

/**
 * Retrieves all saved meeting minutes.
 */
export const getMeetingMinutes = async () => {
  try {
    // Fetches all records, newest first
    const allRows = await db.getAllAsync('SELECT * FROM meeting_minutes ORDER BY id DESC');
    return allRows;
  } catch (error) {
    console.error("SQLite Fetch Minutes Error:", error);
    return [];
  }
};

/**
 * Saves a transaction locally to ensure data isn't lost during offline use.
 */
export const saveTransaction = async (
  userId: number, 
  type: string, 
  amount: number, 
  method: string
) => {
  try {
    const date = new Date().toISOString();
    
    // Using runAsync for INSERT operations
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

/**
 * Retrieves all local transactions. 
 * Useful for the Ledger screen when offline.
 */
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
    // Fetch only items that haven't reached the server yet
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