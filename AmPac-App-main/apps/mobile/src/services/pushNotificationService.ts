import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface NotificationPreferences {
  messages: boolean;
  applications: boolean;
  community: boolean;
  marketing: boolean;
  pushEnabled: boolean;
}

export interface PushNotificationData {
  type: 'message' | 'application' | 'community' | 'system';
  userId?: string;
  conversationId?: string;
  applicationId?: string;
  postId?: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}

class PushNotificationService {
  private expoPushToken: string | null = null;
  private notificationListener: any = null;
  private responseListener: any = null;

  async initialize(userId?: string): Promise<void> {
    try {
      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Push notification permissions not granted');
        return;
      }

      // Get push token
      if (Device.isDevice) {
        const token = await Notifications.getExpoPushTokenAsync({
          projectId: 'd4d70bfc-70cd-4a73-a5c2-bd56d33b2474', // From app.json
        });
        this.expoPushToken = token.data;
        
        // Save token to user profile if userId provided
        if (userId && this.expoPushToken) {
          await this.savePushTokenToProfile(userId, this.expoPushToken);
        }
      } else {
        console.log('Must use physical device for Push Notifications');
      }

      // Configure Android channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });

        await Notifications.setNotificationChannelAsync('messages', {
          name: 'Messages',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          sound: 'default',
        });

        await Notifications.setNotificationChannelAsync('applications', {
          name: 'Applications',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          sound: 'default',
        });

        await Notifications.setNotificationChannelAsync('community', {
          name: 'Community',
          importance: Notifications.AndroidImportance.DEFAULT,
          vibrationPattern: [0, 250, 250, 250],
        });
      }

      // Set up listeners
      this.setupNotificationListeners();

    } catch (error) {
      console.error('Error initializing push notifications:', error);
    }
  }

  private setupNotificationListeners(): void {
    // Listen for notifications received while app is foregrounded
    this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
      this.handleNotificationReceived(notification);
    });

    // Listen for user tapping on notifications
    this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
      this.handleNotificationResponse(response);
    });
  }

  private handleNotificationReceived(notification: Notifications.Notification): void {
    const data = notification.request.content.data as any;
    const type = data?.type || 'system';
    
    // Update badge count
    this.updateBadgeCount(type);
    
    // Store notification for later retrieval
    this.storeNotification(notification);
  }

  private handleNotificationResponse(response: Notifications.NotificationResponse): void {
    const data = response.notification.request.content.data as any;
    
    // Handle deep linking based on notification type
    this.handleDeepLink(data);
  }

  private async updateBadgeCount(type: string): Promise<void> {
    try {
      const currentCount = await Notifications.getBadgeCountAsync();
      await Notifications.setBadgeCountAsync(currentCount + 1);
    } catch (error) {
      console.error('Error updating badge count:', error);
    }
  }

  private async storeNotification(notification: Notifications.Notification): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('stored_notifications');
      const notifications = stored ? JSON.parse(stored) : [];
      
      notifications.unshift({
        id: notification.request.identifier,
        title: notification.request.content.title,
        body: notification.request.content.body,
        data: notification.request.content.data,
        receivedAt: new Date().toISOString(),
        read: false,
      });

      // Keep only last 50 notifications
      const trimmed = notifications.slice(0, 50);
      await AsyncStorage.setItem('stored_notifications', JSON.stringify(trimmed));
    } catch (error) {
      console.error('Error storing notification:', error);
    }
  }

  private handleDeepLink(data: any): void {
    // This will be handled by the navigation service
    // For now, just log the data
    console.log('Deep link data:', data);
  }

  async savePushTokenToProfile(userId: string, token: string): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        pushToken: token,
        pushTokenUpdatedAt: new Date(),
      });
    } catch (error) {
      console.error('Error saving push token:', error);
    }
  }

  async getNotificationPreferences(): Promise<NotificationPreferences> {
    try {
      const stored = await AsyncStorage.getItem('notification_preferences');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error getting notification preferences:', error);
    }

    // Default preferences
    return {
      messages: true,
      applications: true,
      community: true,
      marketing: false,
      pushEnabled: true,
    };
  }

  async updateNotificationPreferences(preferences: NotificationPreferences): Promise<void> {
    try {
      await AsyncStorage.setItem('notification_preferences', JSON.stringify(preferences));
    } catch (error) {
      console.error('Error updating notification preferences:', error);
    }
  }

  async getStoredNotifications(): Promise<any[]> {
    try {
      const stored = await AsyncStorage.getItem('stored_notifications');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error getting stored notifications:', error);
      return [];
    }
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('stored_notifications');
      if (stored) {
        const notifications = JSON.parse(stored);
        const updated = notifications.map((n: any) => 
          n.id === notificationId ? { ...n, read: true } : n
        );
        await AsyncStorage.setItem('stored_notifications', JSON.stringify(updated));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  async clearBadge(): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(0);
    } catch (error) {
      console.error('Error clearing badge:', error);
    }
  }

  async scheduleLocalNotification(
    title: string,
    body: string,
    data?: Record<string, any>,
    trigger?: Notifications.NotificationTriggerInput
  ): Promise<string> {
    try {
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: data || {},
          sound: 'default',
        },
        trigger: trigger || null,
      });
      return identifier;
    } catch (error) {
      console.error('Error scheduling local notification:', error);
      throw error;
    }
  }

  getPushToken(): string | null {
    return this.expoPushToken;
  }

  cleanup(): void {
    if (this.notificationListener) {
      this.notificationListener.remove();
    }
    if (this.responseListener) {
      this.responseListener.remove();
    }
  }
}

export const pushNotificationService = new PushNotificationService();