import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import * as SecureStore from 'expo-secure-store';
import { View, ActivityIndicator } from 'react-native';
import AddSavingsScreen from './src/screens/AddSavingsScreen';
import MembersScreen from './src/screens/MembersScreen';
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import AddMemberScreen from './src/screens/AddMemberScreen';
import CreateGroupScreen from './src/screens/CreateGroupScreen';

const Stack = createStackNavigator();

export default function App() {
  const [initialRoute, setInitialRoute] = useState<string | null>(null);

  useEffect(() => {
    const checkToken = async () => {
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
        <Stack.Screen 
          name="Login" 
          component={LoginScreen} 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="Dashboard" 
          component={DashboardScreen} 
          options={{ title: 'Bharat Bachat', headerLeft: () => null }} 
        />
        <Stack.Screen 
          name="Members" 
          component={MembersScreen} 
          options={{ title: 'Group Members' }} 
        />
        <Stack.Screen 
          name="AddMember" 
          component={AddMemberScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="AddSavings" 
          component={AddSavingsScreen} 
          options={{ title: 'Add Savings' }} 
        /> 
        <Stack.Screen 
          name="CreateGroup"
          component={CreateGroupScreen} 
          options={{ title: 'Create Group' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}