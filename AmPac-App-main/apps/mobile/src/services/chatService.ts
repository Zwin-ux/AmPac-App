import {
    collection,
    query,
    where,
    orderBy,
    onSnapshot,
    addDoc,
    updateDoc,
    doc,
    serverTimestamp,
    limit,
    getDoc,
    arrayUnion,
    arrayRemove
} from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import { Channel, Message } from '../types';
import { API_URL } from '../config';
import { getFirebaseIdToken } from './brainAuth';
import { getCurrentUserId, getCurrentDisplayName } from './authUtils';
import { getApiHeaders } from './assistantService';

export const chatService = {
    /**
     * Subscribe to channels for a specific organization.
     * returns an unsubscribe function.
     */
    subscribeToChannels: (orgId: string, onUpdate: (channels: Channel[]) => void) => {
        // Assume channels are stored at root level 'channels' but filtered by orgId
        // Alternatively, could be subcollection: db.collection('organizations').doc(orgId).collection('channels')
        // Based on plan: organizations/{orgId}/channels/{channelId}
        const channelsRef = collection(db, 'organizations', orgId, 'channels');
        const q = query(channelsRef, orderBy('lastMessage.createdAt', 'desc'));

        return onSnapshot(q, (snapshot) => {
            const channels = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Channel));
            onUpdate(channels);
        }, (error) => {
            console.error("Error subscribing to channels:", error);
            onUpdate([]); // Return empty on error to prevent infinite spinners
        });
    },

    /**
     * Subscribe to messages within a specific channel.
     */
    subscribeToMessages: (orgId: string, channelId: string, onUpdate: (messages: Message[]) => void) => {
        const messagesRef = collection(db, 'organizations', orgId, 'channels', channelId, 'messages');
        const q = query(messagesRef, orderBy('createdAt', 'desc'), limit(50));

        return onSnapshot(q, (snapshot) => {
            const messages = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Message));
            onUpdate(messages);
        }, (error) => {
            console.error("Error subscribing to messages:", error);
            onUpdate([]);
        });
    },

    sendMessage: async (
        orgId: string,
        channelId: string,
        text: string,
        type: 'text' | 'image' = 'text',
        mediaUrl?: string
    ): Promise<string> => {
        try {
            let uid = getCurrentUserId();

            // If no authenticated user in dev mode, attempt anonymous sign-in so chat can use a real auth context
            if (!auth.currentUser && __DEV__) {
                try {
                    const { signInAnonymously } = await import('firebase/auth');
                    const cred = await signInAnonymously(auth);
                    // Create lightweight user doc for dev use
                    const anonUid = cred.user?.uid;
                    if (anonUid) {
                        const { setDoc, doc: firestoreDoc } = await import('firebase/firestore');
                        await setDoc(firestoreDoc(db, 'users', anonUid), {
                            uid: anonUid,
                            role: 'entrepreneur',
                            fullName: 'AmPac Dev User',
                            businessName: 'Dev Business Inc.',
                            createdAt: serverTimestamp()
                        }, { merge: true });
                        uid = anonUid;
                    }
                } catch (e) {
                    console.warn('Anonymous sign-in for chat failed:', e);
                }
            }

            if (!uid) throw new Error("User not authenticated");

            const user = auth.currentUser;
            const displayName = getCurrentDisplayName();

            const messagesRef = collection(db, 'organizations', orgId, 'channels', channelId, 'messages');

            // Create message payload
            const messageData: any = {
                channelId,
                text,
                senderId: uid,
                senderName: displayName,
                type,
                reactions: {},
                replyCount: 0,
                createdAt: serverTimestamp(),
            };

            if (user?.photoURL) {
                messageData.senderAvatar = user.photoURL;
            }

            if (mediaUrl) {
                messageData.mediaUrl = mediaUrl;
            }

            const docRef = await addDoc(messagesRef, messageData);

            // Update channel's last message
            const channelRef = doc(db, 'organizations', orgId, 'channels', channelId);
            await updateDoc(channelRef, {
                lastMessage: {
                    text: type === 'image' ? '📷 Image' : text,
                    senderId: uid,
                    createdAt: serverTimestamp()
                }
            });

            return docRef.id;
        } catch (error) {
            console.error("Error sending message:", error);
            throw error;
        }
    },

    createChannel: async (orgId: string, name: string, type: 'public' | 'private' = 'public', description?: string): Promise<string> => {
        try {
            const uid = getCurrentUserId();
            if (!uid) throw new Error("User not authenticated");

            const channelsRef = collection(db, 'organizations', orgId, 'channels');
            const data: Partial<Channel> = {
                orgId,
                name,
                type,
                description,
                members: [uid],
                createdAt: serverTimestamp() as any,
                createdBy: uid,
                lastMessage: {
                    text: 'Channel created',
                    senderId: uid,
                    createdAt: serverTimestamp() as any
                }
            };
            const docRef = await addDoc(channelsRef, data);
            return docRef.id;
        } catch (error) {
            console.error("Error creating channel:", error);
            throw error;
        }
    },

    toggleReaction: async (orgId: string, channelId: string, messageId: string, emoji: string, userId: string) => {
        try {
            const messageRef = doc(db, 'organizations', orgId, 'channels', channelId, 'messages', messageId);
            const messageSnap = await getDoc(messageRef);

            if (!messageSnap.exists()) return;

            const data = messageSnap.data() as Message;
            const currentReactions = data.reactions || {};
            const usersReacted = currentReactions[emoji] || [];

            if (usersReacted.includes(userId)) {
                // Remove reaction
                // Note: nested field updates in Firestore can be tricky with dot notation for dynamic keys (emojis)
                // We'll replace the specific emoji array.
                const newUsers = usersReacted.filter(uid => uid !== userId);
                await updateDoc(messageRef, {
                    [`reactions.${emoji}`]: newUsers
                });
            } else {
                // Add reaction
                await updateDoc(messageRef, {
                    [`reactions.${emoji}`]: arrayUnion(userId)
                });
            }
        } catch (error) {
            console.error("Error toggling reaction:", error);
        }
    },

    inviteUsers: async (orgId: string, channelId: string, userIds: string[]) => {
        try {
            const channelRef = doc(db, 'organizations', orgId, 'channels', channelId);
            await updateDoc(channelRef, {
                members: arrayUnion(...userIds)
            });
        } catch (error) {
            console.error("Error inviting users:", error);
            throw error;
        }
    },

    /**
     * Get all chat threads for the current user (Borrower <-> Staff).
     */
    getThreads: async () => {
        try {
            const headers = await getApiHeaders();
            const res = await fetch(`${API_URL}/chat/threads`, {
                headers
            });
            if (!res.ok) throw new Error('Failed to fetch threads');
            return await res.json();
        } catch (error) {
            console.error("Error fetching threads:", error);
            return [];
        }
    },

    /**
     * Get messages for a specific thread.
     */
    getThreadMessages: async (threadId: string) => {
        try {
            const headers = await getApiHeaders();
            const res = await fetch(`${API_URL}/chat/threads/${threadId}/messages`, {
                headers
            });
            if (!res.ok) throw new Error('Failed to fetch messages');
            return await res.json();
        } catch (error) {
            console.error("Error fetching thread messages:", error);
            return [];
        }
    },

    /**
     * Send a message to a staff thread.
     */
    sendThreadMessage: async (threadId: string, text: string) => {
        try {
            const headers = await getApiHeaders();
            const res = await fetch(`${API_URL}/chat/threads/${threadId}/messages`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ text })
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || 'Failed to send message');
            }
            return await res.json();
        } catch (error) {
            console.error("Error sending thread message:", error);
            throw error;
        }
    }
};
