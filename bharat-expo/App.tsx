import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import * as SecureStore from 'expo-secure-store';
import { View, ActivityIndicator } from 'react-native';
import './src/i18n'; 
// Screen Imports
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import MembersScreen from './src/screens/MembersScreen';
import AddMemberScreen from './src/screens/AddMemberScreen';
import CreateGroupScreen from './src/screens/CreateGroupScreen';
import JoinGroupScreen from './src/screens/JoinGroupScreen';
import GroupsHubScreen from './src/screens/GroupsHubScreen';
import GroupDetailsScreen from './src/screens/GroupDetailsScreen';
import MyGroupScreen from './src/screens/MyGroupScreen';
import AttendanceScreen from './src/screens/AttendanceScreen';
import MeetingMinutesScreen from './src/screens/MeetingMinutesScreen';
import MeetingHistoryScreen from './src/screens/MeetingHistoryScreen'; 
import LedgerScreen from './src/screens/LedgerScreen';
import AddSavingsScreen from './src/screens/AddSavingsScreen';
import EditTransactionScreen from './src/screens/EditTransactionScreen';
import LoanHubScreen from './src/screens/LoanHubScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import PortfolioScreen from './src/screens/PortfolioScreen';
import { initDatabase } from './src/services/database';

const Stack = createStackNavigator();

export default function App() {
  // FIXED: Removed the <string | null> to clear the linter error
  const [initialRoute, setInitialRoute] = useState<string | null>(null);

  useEffect(() => {
    const checkToken = async () => {
      initDatabase();
      // Look inside the secure vault for our token
      const token = await SecureStore.getItemAsync('userToken');
      // If a token is found, go to Dashboard. Otherwise, go to Login.
      setInitialRoute(token ? 'Dashboard' : 'Login');
    };
    checkToken();
  }, []);

  // Show a loading spinner while checking the vault
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
        <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Bharat Bachat', headerLeft: () => null }} />
        <Stack.Screen name="GroupsHub" component={GroupsHubScreen} options={{ headerShown: false }} />
        <Stack.Screen name="CreateGroup" component={CreateGroupScreen} options={{ title: 'Create Group' }} />
        <Stack.Screen name="JoinGroup" component={JoinGroupScreen} options={{ headerShown: false }} />
        <Stack.Screen name="GroupDetails" component={GroupDetailsScreen} options={{ headerShown: false }} />
        <Stack.Screen name="MyGroup" component={MyGroupScreen} options={{ title: 'My Group' }} />
        <Stack.Screen name="Members" component={MembersScreen} options={{ headerShown: false }} />
        <Stack.Screen name="AddMember" component={AddMemberScreen} options={{ headerShown: false }} />
        
        {/* MEETING & ATTENDANCE ROUTES */}
        <Stack.Screen name="Attendance" component={AttendanceScreen} options={{ headerShown: false }} />
        <Stack.Screen name="MeetingMinutes" component={MeetingMinutesScreen} options={{ headerShown: false }} />
        <Stack.Screen name="MeetingHistory" component={MeetingHistoryScreen} options={{ headerShown: false }} />
        
        {/* FINANCIAL ROUTES */}
        <Stack.Screen name="Ledger" component={LedgerScreen} options={{ headerShown: false }} />
        <Stack.Screen name="AddSavings" component={AddSavingsScreen} options={{ title: 'Deposit Funds' }} />
        <Stack.Screen name="EditTransaction" component={EditTransactionScreen} options={{ title: 'Edit Transaction' }} />
        <Stack.Screen name="LoanHub" component={LoanHubScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Portfolio" component={PortfolioScreen} options={{ headerShown: false }} />
        
        <Stack.Screen name="Profile" component={ProfileScreen} options={{ headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}