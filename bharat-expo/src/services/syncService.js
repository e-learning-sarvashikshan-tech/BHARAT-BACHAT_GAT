import { getUnsyncedAttendance, getUnsyncedMinutes, markAttendanceSynced, markMinutesSynced } from './database';
import * as SecureStore from 'expo-secure-store';
import api from './api';

export const runSilentSync = async () => {
  try {
    console.log("Sync Engine: Checking for offline data...");

    // 1. Fetch anything sitting in the SQLite Vault
    const unsyncedAttendance = await getUnsyncedAttendance();
    const unsyncedMinutes = await getUnsyncedMinutes();

    if (unsyncedAttendance.length === 0 && unsyncedMinutes.length === 0) {
      console.log("Sync Engine: All data is up to date.");
      return; 
    }

    console.log(`Sync Engine: Found ${unsyncedAttendance.length} attendance records & ${unsyncedMinutes.length} minutes. Syncing...`);

    const token = await SecureStore.getItemAsync('userToken');

    // 2. Beam data to Laravel in one single secure payload
    const response = await api.post('/meetings/sync', {
      attendance: unsyncedAttendance,
      minutes: unsyncedMinutes
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (response.data.status === 'success') {
      // 3. If Laravel successfully saved it, lock the vault records so they don't sync again!
      for (let record of unsyncedAttendance) {
        await markAttendanceSynced(record.id);
      }
      for (let record of unsyncedMinutes) {
        await markMinutesSynced(record.id);
      }
      console.log("Sync Engine: Sync complete and local vault locked!");
    }

  } catch (error) {
    console.error("Sync Engine Error: Failed to sync with server. Will try again later.", error.message);
  }
};