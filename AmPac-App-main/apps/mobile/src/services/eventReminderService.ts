import * as Notifications from 'expo-notifications';
import { collection, query, where, getDocs, Timestamp, addDoc } from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import type { Event } from '../types';

// Configure notification handler - wrapped in try-catch to prevent crash on module load
try {
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
            shouldShowBanner: true,
            shouldShowList: true,
        }),
    });
} catch (error) {
    console.warn('[EventReminder] Failed to set notification handler:', error);
}

export interface EventReminder {
    id: string;
    eventId: string;
    userId: string;
    eventTitle: string;
    eventDate: Timestamp;
    reminderType: '24h' | '1h' | 'now';
    sent: boolean;
    createdAt: Timestamp;
}

export const eventReminderService = {
    /**
     * Request notification permissions from the user
     */
    requestPermissions: async (): Promise<boolean> => {
        try {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;

            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }

            if (finalStatus !== 'granted') {
                console.warn('Notification permissions not granted');
                return false;
            }

            return true;
        } catch (error) {
            console.error('Error requesting notification permissions:', error);
            return false;
        }
    },

    /**
     * Schedule reminders when entrepreneur RSVPs to an event
     * @param eventId - Event ID
     * @param eventTitle - Event title for notification
     * @param eventDate - Event start date/time
     * @param location - Event location
     */
    scheduleRemindersForEvent: async (
        eventId: string,
        eventTitle: string,
        eventDate: Date,
        location?: string
    ): Promise<void> => {
        try {
            const userId = auth.currentUser?.uid;
            if (!userId) {
                console.warn('User not authenticated, cannot schedule reminders');
                return;
            }

            // Check permissions
            const hasPermission = await eventReminderService.requestPermissions();
            if (!hasPermission) {
                console.warn('Notification permissions not granted');
                return;
            }

            const now = new Date();
            const scheduledIds: string[] = [];

            // 24 hour reminder
            const reminder24h = new Date(eventDate.getTime() - 24 * 60 * 60 * 1000);
            if (reminder24h > now) {
                const id = await Notifications.scheduleNotificationAsync({
                    content: {
                        title: '📅 Event Tomorrow',
                        body: `${eventTitle} is happening tomorrow${location ? ` at ${location}` : ''}!`,
                        data: { eventId, type: '24h', userId },
                        sound: true,
                    },
                    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: reminder24h },
                });
                scheduledIds.push(id);
            }

            // 1 hour reminder
            const reminder1h = new Date(eventDate.getTime() - 60 * 60 * 1000);
            if (reminder1h > now) {
                const id = await Notifications.scheduleNotificationAsync({
                    content: {
                        title: '⏰ Event Starting Soon',
                        body: `${eventTitle} starts in 1 hour${location ? ` at ${location}` : ''}!`,
                        data: { eventId, type: '1h', userId },
                        sound: true,
                    },
                    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: reminder1h },
                });
                scheduledIds.push(id);
            }

            // Event start reminder
            if (eventDate > now) {
                const id = await Notifications.scheduleNotificationAsync({
                    content: {
                        title: '🎉 Event Starting Now',
                        body: `${eventTitle} is starting now! Don't miss this networking opportunity.`,
                        data: { eventId, type: 'now', userId },
                        sound: true,
                    },
                    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: eventDate },
                });
                scheduledIds.push(id);
            }

            console.log(`Scheduled ${scheduledIds.length} reminders for event: ${eventTitle}`);

            // Store reminder info in Firestore for tracking
            await addDoc(collection(db, 'event_reminders'), {
                eventId,
                userId,
                eventTitle,
                eventDate: Timestamp.fromDate(eventDate),
                scheduledNotificationIds: scheduledIds,
                createdAt: Timestamp.now(),
            });
        } catch (error) {
            console.error('Error scheduling event reminders:', error);
            throw error;
        }
    },

    /**
     * Cancel reminders when entrepreneur un-RSVPs from an event
     * @param eventId - Event ID
     */
    cancelRemindersForEvent: async (eventId: string): Promise<void> => {
        try {
            const userId = auth.currentUser?.uid;
            if (!userId) return;

            // Get all scheduled notifications
            const scheduled = await Notifications.getAllScheduledNotificationsAsync();

            // Cancel notifications for this event
            let cancelCount = 0;
            for (const notification of scheduled) {
                const data = notification.content.data as any;
                if (data?.eventId === eventId && data?.userId === userId) {
                    await Notifications.cancelScheduledNotificationAsync(notification.identifier);
                    cancelCount++;
                }
            }

            console.log(`Cancelled ${cancelCount} reminders for event: ${eventId}`);
        } catch (error) {
            console.error('Error cancelling event reminders:', error);
            throw error;
        }
    },

    /**
     * Get all scheduled reminders for the current user
     */
    getScheduledReminders: async (): Promise<Notifications.NotificationRequest[]> => {
        try {
            const userId = auth.currentUser?.uid;
            if (!userId) return [];

            const scheduled = await Notifications.getAllScheduledNotificationsAsync();

            // Filter for current user's reminders
            return scheduled.filter(notification => {
                const data = notification.content.data as any;
                return data?.userId === userId;
            });
        } catch (error) {
            console.error('Error getting scheduled reminders:', error);
            return [];
        }
    },

    /**
     * Cancel all reminders for the current user
     */
    cancelAllReminders: async (): Promise<void> => {
        try {
            const userId = auth.currentUser?.uid;
            if (!userId) return;

            const scheduled = await Notifications.getAllScheduledNotificationsAsync();

            let cancelCount = 0;
            for (const notification of scheduled) {
                const data = notification.content.data as any;
                if (data?.userId === userId) {
                    await Notifications.cancelScheduledNotificationAsync(notification.identifier);
                    cancelCount++;
                }
            }

            console.log(`Cancelled all ${cancelCount} reminders for user`);
        } catch (error) {
            console.error('Error cancelling all reminders:', error);
            throw error;
        }
    },
};
