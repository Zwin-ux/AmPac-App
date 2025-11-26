import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebaseConfig';
import { ActivityIndicator, View, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Screens
import SignInScreen from './src/screens/SignInScreen';
import SignUpScreen from './src/screens/SignUpScreen';
import HomeScreen from './src/screens/HomeScreen';
import HotlineScreen from './src/screens/HotlineScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import SpacesScreen from './src/screens/SpacesScreen';
import RoomDetailScreen from './src/screens/RoomDetailScreen';
import NetworkScreen from './src/screens/NetworkScreen';
import ApplicationScreen from './src/screens/ApplicationScreen';

// Types
import { User } from './src/types';
import { theme } from './src/theme';
import { Ionicons } from '@expo/vector-icons';
import AssistantBubble from './src/components/AssistantBubble';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const SpacesStack = createNativeStackNavigator();

function SpacesNavigator() {
  return (
    <SpacesStack.Navigator screenOptions={{ headerShown: false }}>
      <SpacesStack.Screen name="SpacesList" component={SpacesScreen} />
      <SpacesStack.Screen name="RoomDetail" component={RoomDetailScreen} />
    </SpacesStack.Navigator>
  );
}

function MainNavigator() {
  return (
    <>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: 'gray',
          tabBarStyle: {
            paddingBottom: 5,
            height: 60,
          },
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: any;

            if (route.name === 'Home') {
              iconName = focused ? 'home' : 'home-outline';
            } else if (route.name === 'Apply') {
              iconName = focused ? 'document-text' : 'document-text-outline';
            } else if (route.name === 'Spaces') {
              iconName = focused ? 'business' : 'business-outline';
            } else if (route.name === 'Network') {
              iconName = focused ? 'people' : 'people-outline';
            } else if (route.name === 'Profile') {
              iconName = focused ? 'person' : 'person-outline';
            } else if (route.name === 'Support') { // Renamed from Hotline
              iconName = focused ? 'help-buoy' : 'help-buoy-outline';
            }

            return <Ionicons name={iconName} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Apply" component={ApplicationScreen} />
        <Tab.Screen name="Spaces" component={SpacesNavigator} />
        <Tab.Screen name="Network" component={NetworkScreen} />
        <Tab.Screen name="Support" component={HotlineScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>
      <AssistantBubble context="home" />
    </>
  );
}

function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SignIn" component={SignInScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
    </Stack.Navigator>
  );
}

export default function App() {
  // const [loading, setLoading] = useState(true);

  // useEffect(() => {
  //   console.log("App mounted, checking auth...");
  //   const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
  //     console.log("Auth state changed:", currentUser ? "User logged in" : "No user");
  //     setUser(currentUser);
  //     setLoading(false);
  //   });
  //   return unsubscribe;
  // }, []);

  // if (loading) {
  //   return (
  //     <SafeAreaProvider>
  //       <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
  //         <ActivityIndicator size="large" color="#004d40" />
  //         <Text style={{ marginTop: 20 }}>Loading AmPac...</Text>
  //       </View>
  //     </SafeAreaProvider>
  //   );
  // }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        {/* DEV MODE: Skip AuthNavigator */}
        <MainNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
