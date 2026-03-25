import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import * as SecureStore from 'expo-secure-store';
import { View, ActivityIndicator, LogBox } from 'react-native'; // <-- IMPORTED LogBox
import './src/i18n'; 

// --- THE FIX: SILENCE THE EXPO GO SANDBOX WARNINGS ---
LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications',
  '`expo-notifications` functionality is not fully supported'
]);

// Screen Imports
import LoginScreen from './src/screens/LoginScreen';
import MembersScreen from './src/screens/MembersScreen';
import AddMemberScreen from './src/screens/AddMemberScreen';
import CreateGroupScreen from './src/screens/CreateGroupScreen';
import JoinGroupScreen from './src/screens/JoinGroupScreen';
import GroupDetailsScreen from './src/screens/GroupDetailsScreen';
import MyGroupScreen from './src/screens/MyGroupScreen';
import MeetingScreen from './src/screens/MeetingScreen';
import MeetingHistoryScreen from './src/screens/MeetingHistoryScreen'; 
import LedgerScreen from './src/screens/LedgerScreen';
import AddSavingsScreen from './src/screens/AddSavingsScreen';
import EditTransactionScreen from './src/screens/EditTransactionScreen';
import LoanHubScreen from './src/screens/LoanHubScreen';
import PortfolioScreen from './src/screens/PortfolioScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import TermsScreen from './src/screens/TermsScreen';
import { initDatabase } from './src/services/database';

import MainTabNavigator from './src/navigation/MainTabNavigator';

const Stack = createStackNavigator();

export default function App() {
  const [initialRoute, setInitialRoute] = useState('');

  useEffect(() => {
    const checkToken = async () => {
      try {
        initDatabase();
        const token = await SecureStore.getItemAsync('userToken');
        setInitialRoute(token ? 'MainTabs' : 'Login');
      } catch (error) {
        setInitialRoute('Login');
      }
    };
    checkToken();
  }, []);

  if (!initialRoute) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2952a3" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={initialRoute}>
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        
        {/* OUR TAB NAVIGATOR IS NOW THE MAIN APP HUB */}
        <Stack.Screen name="MainTabs" component={MainTabNavigator} options={{ headerShown: false }} />
        
        {/* ALL DEEP SCREENS (headerShown: false ensures our custom UI headers look clean!) */}
        <Stack.Screen name="CreateGroup" component={CreateGroupScreen} options={{ headerShown: false }} />
        <Stack.Screen name="JoinGroup" component={JoinGroupScreen} options={{ headerShown: false }} />
        <Stack.Screen name="GroupDetails" component={GroupDetailsScreen} options={{ headerShown: false }} />
        <Stack.Screen name="MyGroup" component={MyGroupScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Members" component={MembersScreen} options={{ headerShown: false }} />
        <Stack.Screen name="AddMember" component={AddMemberScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Portfolio" component={PortfolioScreen} options={{ headerShown: false }} />
        
        <Stack.Screen name="AddMeetingRecords" component={MeetingScreen} options={{ headerShown: false }} />
        <Stack.Screen name="MeetingHistory" component={MeetingHistoryScreen} options={{ headerShown: false }} />
        
        <Stack.Screen name="Ledger" component={LedgerScreen} options={{ headerShown: false }} />
        <Stack.Screen name="AddSavings" component={AddSavingsScreen} options={{ headerShown: false }} />
        <Stack.Screen name="EditTransaction" component={EditTransactionScreen} options={{ headerShown: false }} />
        <Stack.Screen name="TermsScreen" component={TermsScreen} options={{ headerShown: false }} />
        <Stack.Screen name="LoanHub" component={LoanHubScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}