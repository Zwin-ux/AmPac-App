import { collection, addDoc, Timestamp, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';

export interface SupportNotification {
    type: 'application_started' | 'application_denied' | 'help_request' | 'general_inquiry' | 'alternative_product_interest';
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

            // Build notification object, excluding undefined fields
            const notification: Record<string, any> = {
                type: data.type,
                userId: user.uid,
                userName: user.displayName || 'AmPac User',
                userEmail: user.email || 'unknown@email.com',
                timestamp: Timestamp.now(),
                read: false,
                supportEmail: 'help_support@ampac.com'
            };

            // Only add optional fields if they have values
            if (data.denialReason) {
                notification.denialReason = data.denialReason;
            }
            if (data.message) {
                notification.message = data.message;
            }

            await addDoc(collection(db, 'support_notifications'), notification);

            console.log('✅ Support notification sent:', data.type);
        } catch (error) {
            console.error('❌ Error sending support notification:', error);
            // Don't throw - support notifications are non-critical
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
     * Send alternative product interest notification
     */
    notifyAlternativeProductInterest: async (amount: string, years: string, suggestions: string): Promise<void> => {
        await supportNotificationService.sendNotification({
            type: 'alternative_product_interest',
            message: `User interested in alternative products. Loan amount: $${amount}, Years in business: ${years}, Suggestions: ${suggestions}`
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
            return snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    type: data.type,
                    userId: data.userId,
                    userName: data.userName,
                    userEmail: data.userEmail,
                    supportEmail: data.supportEmail || 'support@ampac.com',
                    message: data.message,
                    timestamp: data.timestamp,
                    read: data.read,
                    priority: data.priority,
                    metadata: data.metadata,
                    denialReason: data.denialReason,
                } as SupportNotification;
            });
        } catch (error) {
            console.error('Error fetching support notifications:', error);
            return [];
        }
    }
};
