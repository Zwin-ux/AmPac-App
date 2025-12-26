import { useState, useEffect, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import { AppState, AppStateStatus } from 'react-native';
import { pushNotificationService, NotificationPreferences } from '../services/pushNotificationService';
// import { useAuth } from '../context/AuthContext';
import { auth } from '../../firebaseConfig';

export interface StoredNotification {
  id: string;
  title: string;
  body: string;
  data: any;
  receivedAt: string;
  read: boolean;
}

export const useNotifications = () => {
  const user = auth.currentUser; // Direct access instead of useAuth hook
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [notifications, setNotifications] = useState<StoredNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize push notifications
  useEffect(() => {
    const initializeNotifications = async () => {
      if (user?.uid && !isInitialized) {
        try {
          await pushNotificationService.initialize(user.uid);
          setIsInitialized(true);
        } catch (error) {
          console.error('Failed to initialize notifications:', error);
        }
      }
    };

    initializeNotifications();
  }, [user?.uid, isInitialized]);

  // Load preferences and notifications
  useEffect(() => {
    const loadData = async () => {
      try {
        const [prefs, storedNotifications] = await Promise.all([
          pushNotificationService.getNotificationPreferences(),
          pushNotificationService.getStoredNotifications(),
        ]);

        setPreferences(prefs);
        setNotifications(storedNotifications);
        
        const unread = storedNotifications.filter(n => !n.read).length;
        setUnreadCount(unread);
      } catch (error) {
        console.error('Error loading notification data:', error);
      }
    };

    if (isInitialized) {
      loadData();
    }
  }, [isInitialized]);

  // Handle app state changes to refresh notifications
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && isInitialized) {
        refreshNotifications();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [isInitialized]);

  const refreshNotifications = useCallback(async () => {
    try {
      const storedNotifications = await pushNotificationService.getStoredNotifications();
      setNotifications(storedNotifications);
      
      const unread = storedNotifications.filter(n => !n.read).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Error refreshing notifications:', error);
    }
  }, []);

  const updatePreferences = useCallback(async (newPreferences: NotificationPreferences) => {
    try {
      await pushNotificationService.updateNotificationPreferences(newPreferences);
      setPreferences(newPreferences);
    } catch (error) {
      console.error('Error updating preferences:', error);
      throw error;
    }
  }, []);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await pushNotificationService.markNotificationAsRead(notificationId);
      
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      const promises = notifications
        .filter(n => !n.read)
        .map(n => pushNotificationService.markNotificationAsRead(n.id));
      
      await Promise.all(promises);
      
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      
      // Clear app badge
      await pushNotificationService.clearBadge();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, [notifications]);

  const clearBadge = useCallback(async () => {
    try {
      await pushNotificationService.clearBadge();
    } catch (error) {
      console.error('Error clearing badge:', error);
    }
  }, []);

  const scheduleLocalNotification = useCallback(async (
    title: string,
    body: string,
    data?: Record<string, any>,
    delaySeconds?: number
  ) => {
    try {
      const trigger = delaySeconds ? { 
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL as const,
        seconds: delaySeconds 
      } : null;
      return await pushNotificationService.scheduleLocalNotification(title, body, data, trigger);
    } catch (error) {
      console.error('Error scheduling notification:', error);
      throw error;
    }
  }, []);

  const getPushToken = useCallback(() => {
    return pushNotificationService.getPushToken();
  }, []);

  return {
    preferences,
    notifications,
    unreadCount,
    isInitialized,
    updatePreferences,
    markAsRead,
    markAllAsRead,
    clearBadge,
    refreshNotifications,
    scheduleLocalNotification,
    getPushToken,
  };
};