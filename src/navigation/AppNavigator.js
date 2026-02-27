import React, { useState, useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, StyleSheet, ActivityIndicator } from 'react-native';

import { COLORS, TYPOGRAPHY } from '../constants/theme';
import { onAuthChange, getCurrentAuthUser } from '../utils/storage';

// Import screens
import LoginScreen from '../screens/LoginScreen';
import FeedScreen from '../screens/FeedScreen';
import CreatePostScreen from '../screens/CreatePostScreen';
import ProfileScreen from '../screens/ProfileScreen';
import CommentsScreen from '../screens/CommentsScreen';
import OtherProfileScreen from '../screens/OtherProfileScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Tab Icon component
const TabIcon = ({ focused, icon, label }) => (
  <View style={styles.tabIconContainer}>
    <Text style={[styles.tabIcon, focused && styles.tabIconFocused]}>
      {icon}
    </Text>
    <Text style={[styles.tabLabel, focused && styles.tabLabelFocused]}>
      {label}
    </Text>
  </View>
);

// Main Tab Navigator
const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen 
        name="Feed" 
        component={FeedScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="🏠" label="Home" />
          ),
        }}
      />
      <Tab.Screen 
        name="CreatePost" 
        component={CreatePostScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="➕" label="Post" />
          ),
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="👤" label="Profile" />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

// Root Navigator
const AppNavigator = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const hasReceivedFirstCallback = useRef(false);

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = onAuthChange((user) => {
      console.log('Auth state changed, user:', user ? user.uid : 'null');
      
      // Only update state after first callback (Firebase initial check complete)
      hasReceivedFirstCallback.current = true;
      
      setIsLoggedIn(!!user);
      setIsLoading(false);
    });

    // Check cached user as fallback
    const cachedUser = getCurrentAuthUser();
    if (cachedUser && !hasReceivedFirstCallback.current) {
      console.log('Using cached user:', cachedUser.uid);
      setIsLoggedIn(true);
      hasReceivedFirstCallback.current = true;
      setIsLoading(false);
    }
    
    // Timeout fallback - show login after 5 seconds
    const timeout = setTimeout(() => {
      if (!hasReceivedFirstCallback.current) {
        console.log('Auth check timed out');
        setIsLoggedIn(false);
        setIsLoading(false);
      }
    }, 5000);

    // Cleanup
    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  if (isLoading || isLoggedIn === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>☁️ Connecting to Firebase...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: COLORS.background },
          gestureEnabled: true,
        }}
      >
        {!isLoggedIn ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen 
              name="Comments" 
              component={CommentsScreen}
              options={{ presentation: 'modal' }}
            />
            <Stack.Screen name="OtherProfile" component={OtherProfileScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    fontSize: TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginTop: 16,
  },
  tabBar: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    height: 70,
    paddingTop: 8,
    paddingBottom: 12,
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIcon: {
    fontSize: 24,
    marginBottom: 4,
    opacity: 0.5,
  },
  tabIconFocused: {
    opacity: 1,
  },
  tabLabel: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textTertiary,
  },
  tabLabelFocused: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});

export default AppNavigator;

