import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../constants/theme';

// Import your main pillar screens
import DashboardScreen from '../screens/DashboardScreen';
import GroupsHubScreen from '../screens/GroupsHubScreen';
import PortfolioScreen from '../screens/PortfolioScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

const MainTabNavigator = () => {
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false, // We hide the header because our screens already have custom headers
        tabBarActiveTintColor: COLORS.primaryBlue,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: {
          backgroundColor: COLORS.bgWhite,
          borderTopWidth: 1,
          borderTopColor: COLORS.borderLight,
          height: 75, // <-- INCREASED FROM 65
          paddingBottom: 15, // <-- INCREASED FROM 10
          paddingTop: 10,
          elevation: 10, 
          shadowColor: '#000', 
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: 'bold',
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'MyGats') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Portfolio') {
            iconName = focused ? 'wallet' : 'wallet-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          // Return the specific icon for each tab
          return <Ionicons name={iconName} size={24} color={color} />;
        },
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={DashboardScreen} 
        options={{ tabBarLabel: t('tabs.home', 'Home') }} 
      />
      <Tab.Screen 
        name="MyGats" 
        component={GroupsHubScreen} 
        options={{ tabBarLabel: t('tabs.myGats', 'My Gats') }} 
      />
      <Tab.Screen 
        name="Portfolio" 
        component={PortfolioScreen} 
        options={{ tabBarLabel: t('tabs.portfolio', 'Savings') }} 
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{ tabBarLabel: t('tabs.profile', 'Profile') }} 
      />
    </Tab.Navigator>
  );
};

export default MainTabNavigator;