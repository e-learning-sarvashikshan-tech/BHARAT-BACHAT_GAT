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
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        type TEXT,           -- 'deposit' or 'withdrawal'
        amount REAL,
        date TEXT,           -- ISO format date string
        method TEXT,         -- 'Cash', 'UPI', etc.
        synced INTEGER DEFAULT 0 -- 0 = local only, 1 = synced to Laravel API
      );
    `);
    console.log("SQLite: Bharat Bachat database is ready!");
  } catch (error) {
    console.error("SQLite Initialization Error:", error);
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