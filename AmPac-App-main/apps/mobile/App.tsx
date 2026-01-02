import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StripeProvider } from '@stripe/stripe-react-native';
import { STRIPE_CONFIG } from './src/config';

// Configuration validation disabled for v1 launch - Brain API removed
// import { logConfigurationStatus } from './src/utils/configValidator';
// logConfigurationStatus();

// Screens
import SignInScreen from './src/screens/SignInScreen';
import SignUpScreen from './src/screens/SignUpScreen';
import OpenSplashScreen from './src/screens/OpenSplashScreen';
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
import PaymentScreen from './src/screens/PaymentScreen';
import FeedScreen from './src/screens/FeedScreen';
import ChatScreenWrapper from './src/screens/ChatScreenWrapper';
import DemographicsScreen from './src/screens/DemographicsScreen';
import SkillsScreen from './src/screens/SkillsScreen';
import MarketplaceScreen from './src/screens/MarketplaceScreen';
import ErrorBoundary from './src/components/ErrorBoundary';
import LoadingScreen from './src/components/LoadingScreen';
import { ToastProvider } from './src/context/ToastContext';
import PreliminaryIntakeScreen from './src/screens/PreliminaryIntakeScreen';
import BusinessAdminScreen from './src/screens/BusinessAdminScreen';
import CalendarScreen from './src/screens/CalendarScreen';

// Types
import { theme } from './src/theme';
import { Ionicons } from '@expo/vector-icons';
import { onAuthStateChanged } from 'firebase/auth';
import { User } from './src/types';
import { auth } from './firebaseConfig';
import { userStore } from './src/services/userStore';
import { notificationService } from './src/services/notificationService';
import { useToast } from './src/context/ToastContext';
import { seedAmpacBusiness, checkIfAmpacExists } from './src/services/seedAmpacBusiness';
import { pushNotificationService } from './src/services/pushNotificationService';
import { directMessageService } from './src/services/directMessageService';
import OfflineIndicator from './src/components/OfflineIndicator';

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

import SocialHubScreen from './src/screens/SocialHubScreen';
import DirectMessagesScreen from './src/screens/DirectMessagesScreen';
import { telemetryService } from './src/services/telemetry';
import { performanceMonitor } from './src/services/performanceMonitor';

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
            } else if (route.name === 'Social') {
              iconName = focused ? 'people' : 'people-outline';
            } else if (route.name === 'Support') {
              iconName = focused ? 'help-buoy' : 'help-buoy-outline';
            }

            return <Ionicons name={iconName} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen name="HomeTab" component={HomeScreen} options={{ title: 'Home' }} />
        <Tab.Screen name="Apply" component={ApplicationScreen} />
        <Tab.Screen name="Spaces" component={SpacesNavigator} />
        <Tab.Screen name="Social" component={SocialHubScreen} />
        <Tab.Screen
          name="Support"
          component={HotlineScreen}
          options={{ title: 'Support' }}
        />
      </Tab.Navigator>
    </>
  );
}

function AppStack() {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // Start measuring cold start performance
    performanceMonitor.measureColdStart();
    
    // Start measuring auth check
    performanceMonitor.measureAuthCheck();

    const unsubscribe = userStore.subscribe((u) => {
      setUser(u);
      setLoading(false);
      
      // Complete auth check measurement
      performanceMonitor.completeAuthCheck();
      
      // Start navigation ready measurement
      performanceMonitor.measureNavigationReady();
    });

    const authUnsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        await userStore.syncWithServer();
      } else {
        await userStore.clearUser();
      }
    });

    // Hydrate user store first
    userStore.hydrateFromStorage();

    // Initialize AMPAC business AFTER a delay to ensure Firebase is ready
    const initializeAmpac = async () => {
      try {
        // Wait a bit to ensure Firebase is fully initialized
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const exists = await checkIfAmpacExists();
        if (!exists) {
          console.log('🏢 Seeding AMPAC business...');
          await seedAmpacBusiness();
          console.log('✅ AMPAC business seeded successfully!');
        }
      } catch (error) {
        console.error('❌ Error initializing AMPAC business:', error);
        // Don't re-throw - this is not critical for app startup
      }
    };
    
    // Call with proper error handling and delay
    setTimeout(() => {
      initializeAmpac().catch(error => {
        console.error('❌ AMPAC initialization failed:', error);
      });
    }, 3000); // Wait 3 seconds after app start

    // Track app open
    telemetryService.track({ type: 'app_open', screen: 'Splash' });

    return () => {
      unsubscribe();
      authUnsubscribe();
      pushNotificationService.cleanup();
      directMessageService.cleanup();
    };
  }, []);

  // Complete performance measurements when navigation is ready
  React.useEffect(() => {
    if (!loading) {
      // Complete cold start measurement
      performanceMonitor.completeColdStart();
      
      // Complete navigation ready measurement
      performanceMonitor.completeNavigationReady();
      
      // Complete overall app launch measurement
      performanceMonitor.completeAppLaunch();
    }
  }, [loading]);

  // Notification Listener
  const { showToast } = useToast();
  React.useEffect(() => {
    if (!user) return;

    const unsubNotifications = notificationService.subscribeToNotifications(user.uid, (notifications) => {
      // Find unread notifications created in the last 10 seconds (to avoid spamming on load)
      // Actually, subscribeToNotifications returns unread ones.
      // We'll just toast the newest one if it's new.
      // For simplicity in this demo, we'll just toast the first one if it exists and we haven't seen it in this session constraint?
      // Better: Just toast the top one if it's unread.
      // Real implementation would track "seen" locally to avoid re-toasting on refresh.
      // For now, let's just mark it as read immediately after toasting?
      // Or simply:
      const latest = notifications[0];
      if (latest && !latest.read) {
        showToast({ message: `${latest.title}: ${latest.body}`, type: 'info', duration: 4000 });
        // Mark as read so it doesn't pop again next time
        notificationService.markAsRead(latest.id);
      }
    });

    return () => unsubNotifications();
  }, [user]);

  if (loading) {
    return <LoadingScreen message="Starting AmPac..." />;
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
          <Stack.Screen name="Demographics" component={DemographicsScreen} />
          <Stack.Screen name="Skills" component={SkillsScreen} />
          <Stack.Screen name="InviteFriends" component={InviteFriendsScreen} />
          <Stack.Screen name="Marketplace" component={MarketplaceScreen} />
          <Stack.Screen name="Payment" component={PaymentScreen} />
          <Stack.Screen name="Feed" component={FeedScreen} />
          <Stack.Screen name="PreliminaryIntake" component={PreliminaryIntakeScreen} />
          <Stack.Screen name="Network" component={NetworkScreen} />
          <Stack.Screen name="Chat" component={ChatScreenWrapper} />
          <Stack.Screen name="DirectMessages" component={DirectMessagesScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="BusinessAdmin" component={BusinessAdminScreen} />
          <Stack.Screen name="Calendar" component={CalendarScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="OpenSplash" component={OpenSplashScreen} />
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
    <ErrorBoundary>
      <SafeAreaProvider>
        <StripeProvider
          publishableKey={STRIPE_CONFIG.publishableKey}
          merchantIdentifier={STRIPE_CONFIG.merchantIdentifier}
          urlScheme={STRIPE_CONFIG.urlScheme}
        >
          <ToastProvider>
            <NavigationContainer>
              <OfflineIndicator />
              <AppStack />
            </NavigationContainer>
          </ToastProvider>
        </StripeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
