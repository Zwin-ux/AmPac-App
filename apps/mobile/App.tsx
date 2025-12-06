import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Screens
import SignInScreen from './src/screens/SignInScreen';
import SignUpScreen from './src/screens/SignUpScreen';
import LandingScreen from './src/screens/LandingScreen';
import HomeScreen from './src/screens/HomeScreen';
import HotlineScreen from './src/screens/HotlineScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import SpacesScreen from './src/screens/SpacesScreen';
import RoomDetailScreen from './src/screens/RoomDetailScreen';
import NetworkScreen from './src/screens/NetworkScreen';
import ApplicationScreen from './src/screens/ApplicationScreen';
import MultiRoomBookingScreen from './src/screens/MultiRoomBookingScreen';
import EditProfileScreen from './src/screens/EditProfileScreen';
import InviteFriendsScreen from './src/screens/InviteFriendsScreen';
import BusinessProfileScreen from './src/screens/BusinessProfileScreen';
import WebsiteBuilderScreen from './src/screens/WebsiteBuilderScreen';
import AssistantScreen from './src/screens/AssistantScreen';

// Types
import { theme } from './src/theme';
import { Ionicons } from '@expo/vector-icons';
import { onAuthStateChanged } from 'firebase/auth';
import { User } from './src/types';
import { auth } from './firebaseConfig';
import { userStore } from './src/services/userStore';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const SpacesStack = createNativeStackNavigator();

function SpacesNavigator() {
  return (
    <SpacesStack.Navigator screenOptions={{ headerShown: false }}>
      <SpacesStack.Screen name="SpacesList" component={SpacesScreen} />
    </SpacesStack.Navigator>
  );
}

function MainTabs() {
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

            if (route.name === 'HomeTab') {
              iconName = focused ? 'home' : 'home-outline';
            } else if (route.name === 'Apply') {
              iconName = focused ? 'document-text' : 'document-text-outline';
            } else if (route.name === 'Spaces') {
              iconName = focused ? 'business' : 'business-outline';
            } else if (route.name === 'Network') {
              iconName = focused ? 'people' : 'people-outline';
            } else if (route.name === 'Profile') {
              iconName = focused ? 'person' : 'person-outline';
            } else if (route.name === 'Support') {
              iconName = focused ? 'help-buoy' : 'help-buoy-outline';
            } else if (route.name === 'Assistant') {
              iconName = focused ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline';
            }

            return <Ionicons name={iconName} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen name="HomeTab" component={HomeScreen} options={{ title: 'Home' }} />
        <Tab.Screen name="Apply" component={ApplicationScreen} />
        <Tab.Screen name="Spaces" component={SpacesNavigator} />
        <Tab.Screen name="Network" component={NetworkScreen} />
        <Tab.Screen name="Support" component={HotlineScreen} />
        {/* Feature Flag: Borrower Concierge */}
        <Tab.Screen
          name="Assistant"
          component={AssistantScreen}
          options={{ title: 'Concierge' }}
        />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>
    </>
  );
}

function AppStack() {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const unsubscribe = userStore.subscribe((u) => {
      setUser(u);
      setLoading(false);
    });

    const authUnsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        await userStore.syncWithServer();
      }
    });

    userStore.hydrateFromStorage();

    return () => {
      unsubscribe();
      authUnsubscribe();
    };
  }, []);

  if (loading) {
    return null;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <>
          <Stack.Screen name="Home" component={MainTabs} />
          <Stack.Screen name="BusinessProfile" component={BusinessProfileScreen} />
          <Stack.Screen name="RoomDetail" component={RoomDetailScreen} />
          <Stack.Screen name="MultiRoomBooking" component={MultiRoomBookingScreen} />
          <Stack.Screen name="Application" component={ApplicationScreen} />
          <Stack.Screen name="EditProfile" component={EditProfileScreen} />
          <Stack.Screen name="InviteFriends" component={InviteFriendsScreen} />
          <Stack.Screen name="WebsiteBuilder" component={WebsiteBuilderScreen} />
          <Stack.Screen name="Network" component={NetworkScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Landing" component={LandingScreen} />
          <Stack.Screen name="SignIn" component={SignInScreen} />
          <Stack.Screen name="SignUp" component={SignUpScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <AppStack />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
