import { collection, addDoc, Timestamp, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';

export interface SupportNotification {
    type: 'application_started' | 'application_denied' | 'help_request' | 'general_inquiry';
    userId: string;
    userName: string;
    userEmail: string;
    denialReason?: string;
    message?: string;
    timestamp: Timestamp;
    read: boolean;
    supportEmail: string;
}

export const supportNotificationService = {
    /**
     * Send notification to support team
     */
    sendNotification: async (data: {
        type: SupportNotification['type'];
        denialReason?: string;
        message?: string;
    }): Promise<void> => {
        try {
            const user = auth.currentUser;
            if (!user) {
                console.warn('No authenticated user for support notification');
                return;
            }

            const notification: Omit<SupportNotification, 'id'> = {
                type: data.type,
                userId: user.uid,
                userName: user.displayName || 'AmPac User',
                userEmail: user.email || 'unknown@email.com',
                denialReason: data.denialReason,
                message: data.message,
                timestamp: Timestamp.now(),
                read: false,
                supportEmail: 'help_support@ampac.com'
            };

            await addDoc(collection(db, 'support_notifications'), notification);

            console.log('✅ Support notification sent:', data.type);
        } catch (error) {
            console.error('❌ Error sending support notification:', error);
            throw error;
        }
    },

    /**
     * Send application started notification
     */
    notifyApplicationStarted: async (): Promise<void> => {
        await supportNotificationService.sendNotification({
            type: 'application_started',
            message: 'User has started a new loan application'
        });
    },

    /**
     * Send application denied notification
     */
    notifyApplicationDenied: async (reason: string): Promise<void> => {
        await supportNotificationService.sendNotification({
            type: 'application_denied',
            denialReason: reason,
            message: `Application denied: ${reason}`
        });
    },

    /**
     * Send help request notification
     */
    notifyHelpRequest: async (message: string): Promise<void> => {
        await supportNotificationService.sendNotification({
            type: 'help_request',
            message
        });
    },

    /**
     * Get all support notifications (for admin dashboard)
     */
    getAllNotifications: async (unreadOnly: boolean = false): Promise<SupportNotification[]> => {
        try {
            let q = query(
                collection(db, 'support_notifications'),
                orderBy('timestamp', 'desc'),
                limit(100)
            );

            if (unreadOnly) {
                q = query(
                    collection(db, 'support_notifications'),
                    where('read', '==', false),
                    orderBy('timestamp', 'desc'),
                    limit(100)
                );
            }

            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({
                ...doc.data(),
                id: doc.id
            } as SupportNotification));
        } catch (error) {
            console.error('Error fetching support notifications:', error);
            return [];
        }
    }
};
