import { Platform } from 'react-native';
import Constants from 'expo-constants';

const isExpoGo = Constants.appOwnership === 'expo';

let Notifications = null;

if (!isExpoGo) {
  try {
    Notifications = require('expo-notifications');
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  } catch (e) {
    console.log("Notification Handler bypassed.");
  }
}

export const requestNotificationPermissions = async () => {
  if (isExpoGo || !Notifications) return false; 

  try {
    let finalStatus;
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') return false;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2952a3', 
      });
    }
    return true;
  } catch (error) {
    return false; 
  }
};

// --- UPDATED: Now accepts translated titleText and bodyText ---
export const scheduleMeetingReminderLocal = async (meetingDayInt, titleText, bodyText) => {
  if (isExpoGo || !Notifications) return;

  try {
    const meetingDay = parseInt(meetingDayInt) || 5; 
    const triggerDate = new Date();
    triggerDate.setDate(meetingDay);
    triggerDate.setHours(9, 0, 0, 0); 
    
    triggerDate.setDate(triggerDate.getDate() - 1);

    if (triggerDate < new Date()) {
      triggerDate.setMonth(triggerDate.getMonth() + 1);
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: titleText,
        body: bodyText,
        sound: true,
      },
      trigger: {
        date: triggerDate,
        channelId: 'default'
      },
    });
  } catch (error) {
    console.log("Could not schedule meeting reminder.");
  }
};

// --- UPDATED: Now accepts translated titleText and bodyText ---
export const scheduleEmiReminderLocal = async (meetingDayInt, titleText, bodyText) => {
  if (isExpoGo || !Notifications) return;

  try {
    const meetingDay = parseInt(meetingDayInt) || 5; 
    const triggerDate = new Date();
    triggerDate.setDate(meetingDay);
    triggerDate.setHours(10, 0, 0, 0); 

    triggerDate.setDate(triggerDate.getDate() - 3);

    if (triggerDate < new Date()) {
        triggerDate.setMonth(triggerDate.getMonth() + 1);
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: titleText,
        body: bodyText,
        sound: true,
      },
      trigger: {
        date: triggerDate,
        channelId: 'default'
      },
    });
  } catch (error) {
    console.log("Could not schedule EMI reminder.");
  }
};

export const cancelAllReminders = async () => {
  if (isExpoGo || !Notifications) return;
  
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    // Fail silently
  }
};