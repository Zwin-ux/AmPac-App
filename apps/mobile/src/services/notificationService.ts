import {
    collection,
    addDoc,
    serverTimestamp,
    query,
    where,
    onSnapshot,
    orderBy,
    limit,
    doc,
    updateDoc,
    Timestamp
} from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import { Notification } from '../types';

export const notificationService = {
    /**
   * Send a notification when someone joins a business team via invite code.
   */
    sendTeamJoinNotification: async (businessOwnerId: string, joinerName: string, businessName: string) => {
        try {
            await addDoc(collection(db, 'notifications'), {
                userId: businessOwnerId,
                type: 'invite', // Reusing 'invite' type for join events essentially
                title: 'New Team Member',
                body: `${joinerName} has joined ${businessName}!`,
                data: {},
                read: false,
                createdAt: serverTimestamp()
            });
        } catch (error) {
            console.error('Error sending team join notification:', error);
        }
    },

    /**
     * Send a notification when a user is invited to a business team (Direct invite).
     */
    sendInviteNotification: async (targetUserId: string, businessName: string, businessId: string) => {
        try {
            await addDoc(collection(db, 'notifications'), {
                userId: targetUserId,
                type: 'invite',
                title: 'Team Invitation',
                body: `You have been invited to join ${businessName}!`,
                data: { businessId },
                read: false,
                createdAt: serverTimestamp()
            });
        } catch (error) {
            console.error('Error sending invite notification:', error);
        }
    },

    /**
     * Send a notification when someone RSVPs to an event.
     */
    sendRSVPNotification: async (targetUserId: string, eventTitle: string, eventId: string, attendeeName: string) => {
        try {
            await addDoc(collection(db, 'notifications'), {
                userId: targetUserId,
                type: 'rsvp',
                title: 'New Event RSVP',
                body: `${attendeeName} is attending your event: ${eventTitle}!`,
                data: { eventId },
                read: false,
                createdAt: serverTimestamp()
            });
        } catch (error) {
            console.error('Error sending RSVP notification:', error);
        }
    },

    /**
     * Subscribe to unread notifications for a specific user.
     */
    subscribeToNotifications: (userId: string, onUpdate: (notifications: Notification[]) => void) => {
        const q = query(
            collection(db, 'notifications'),
            where('userId', '==', userId),
            where('read', '==', false),
            orderBy('createdAt', 'desc'),
            limit(20)
        );

        return onSnapshot(q, (snapshot) => {
            const notifications = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Notification));
            onUpdate(notifications);
        });
    },

    /**
     * Mark a notification as read.
     */
    markAsRead: async (notificationId: string) => {
        try {
            const notificationRef = doc(db, 'notifications', notificationId);
            await updateDoc(notificationRef, { read: true });
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    },

    /**
     * Send a notification when someone comments on a post.
     */
    sendCommentNotification: async (postAuthorId: string, commenterName: string, postId: string, commentPreview: string) => {
        try {
            const user = auth.currentUser;
            // Don't notify if commenting on own post
            if (user?.uid === postAuthorId) return;

            await addDoc(collection(db, 'notifications'), {
                userId: postAuthorId,
                type: 'comment',
                title: 'New Comment',
                body: `${commenterName} commented: "${commentPreview.slice(0, 50)}${commentPreview.length > 50 ? '...' : ''}"`,
                data: { postId },
                read: false,
                createdAt: serverTimestamp()
            });
        } catch (error) {
            console.error('Error sending comment notification:', error);
        }
    },

    /**
     * Send a notification when someone replies to a comment.
     */
    sendReplyNotification: async (commentAuthorId: string, replierName: string, postId: string, replyPreview: string) => {
        try {
            const user = auth.currentUser;
            // Don't notify if replying to own comment
            if (user?.uid === commentAuthorId) return;

            await addDoc(collection(db, 'notifications'), {
                userId: commentAuthorId,
                type: 'reply',
                title: 'New Reply',
                body: `${replierName} replied: "${replyPreview.slice(0, 50)}${replyPreview.length > 50 ? '...' : ''}"`,
                data: { postId },
                read: false,
                createdAt: serverTimestamp()
            });
        } catch (error) {
            console.error('Error sending reply notification:', error);
        }
    },

    /**
     * Send a notification when someone likes a post.
     */
    sendLikeNotification: async (postAuthorId: string, likerName: string, postId: string) => {
        try {
            const user = auth.currentUser;
            // Don't notify if liking own post
            if (user?.uid === postAuthorId) return;

            await addDoc(collection(db, 'notifications'), {
                userId: postAuthorId,
                type: 'like',
                title: 'New Like',
                body: `${likerName} liked your post`,
                data: { postId },
                read: false,
                createdAt: serverTimestamp()
            });
        } catch (error) {
            console.error('Error sending like notification:', error);
        }
    }
};
