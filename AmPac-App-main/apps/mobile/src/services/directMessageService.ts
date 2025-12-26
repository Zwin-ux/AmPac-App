import { 
    collection, 
    addDoc, 
    query, 
    where, 
    orderBy, 
    onSnapshot, 
    doc, 
    updateDoc, 
    getDoc, 
    getDocs,
    Timestamp,
    writeBatch,
    limit,
    serverTimestamp
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { db, auth } from '../../firebaseConfig';
import { DirectMessage, DirectConversation } from '../types';

interface ReliableMessage extends DirectMessage {
    localId: string;
    status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
    retryCount: number;
    queuedAt?: Timestamp;
}

interface QueuedMessage {
    localId: string;
    conversationId: string;
    recipientId: string;
    content: string;
    type: 'text' | 'image' | 'document';
    mediaUrl?: string;
    timestamp: number;
    retryCount: number;
}

interface TypingIndicator {
    userId: string;
    conversationId: string;
    isTyping: boolean;
    timestamp: Timestamp;
}

export const directMessageService = {
    // Private properties for offline queue and retry logic
    _messageQueue: [] as QueuedMessage[],
    _isOnline: true,
    _retryInterval: null as NodeJS.Timeout | null,
    _typingTimeouts: new Map<string, NodeJS.Timeout>(),

    /**
     * Initialize the service with network monitoring and queue processing
     */
    initialize: async (): Promise<void> => {
        try {
            // Load queued messages from storage
            await directMessageService._loadQueueFromStorage();
            
            // Monitor network status
            NetInfo.addEventListener(state => {
                const wasOffline = !directMessageService._isOnline;
                directMessageService._isOnline = state.isConnected ?? false;
                
                // Process queue when coming back online
                if (wasOffline && directMessageService._isOnline) {
                    directMessageService._processQueue();
                }
            });

            // Start retry interval
            directMessageService._startRetryInterval();
        } catch (error) {
            console.error('Error initializing direct message service:', error);
        }
    },

    /**
     * Load queued messages from AsyncStorage
     */
    _loadQueueFromStorage: async (): Promise<void> => {
        try {
            const stored = await AsyncStorage.getItem('message_queue');
            if (stored) {
                directMessageService._messageQueue = JSON.parse(stored);
            }
        } catch (error) {
            console.error('Error loading message queue:', error);
        }
    },

    /**
     * Save queued messages to AsyncStorage
     */
    _saveQueueToStorage: async (): Promise<void> => {
        try {
            await AsyncStorage.setItem('message_queue', JSON.stringify(directMessageService._messageQueue));
        } catch (error) {
            console.error('Error saving message queue:', error);
        }
    },

    /**
     * Start retry interval for failed messages
     */
    _startRetryInterval: (): void => {
        if (directMessageService._retryInterval) {
            clearInterval(directMessageService._retryInterval);
        }
        
        directMessageService._retryInterval = setInterval(() => {
            if (directMessageService._isOnline && directMessageService._messageQueue.length > 0) {
                directMessageService._processQueue();
            }
        }, 30000); // Retry every 30 seconds
    },

    /**
     * Process queued messages
     */
    _processQueue: async (): Promise<void> => {
        if (!directMessageService._isOnline || directMessageService._messageQueue.length === 0) {
            return;
        }

        const messagesToProcess = [...directMessageService._messageQueue];
        
        for (const queuedMessage of messagesToProcess) {
            try {
                await directMessageService._sendQueuedMessage(queuedMessage);
                
                // Remove from queue on success
                directMessageService._messageQueue = directMessageService._messageQueue.filter(
                    m => m.localId !== queuedMessage.localId
                );
            } catch (error) {
                console.error('Error processing queued message:', error);
                
                // Increment retry count
                const messageIndex = directMessageService._messageQueue.findIndex(
                    m => m.localId === queuedMessage.localId
                );
                
                if (messageIndex !== -1) {
                    directMessageService._messageQueue[messageIndex].retryCount++;
                    
                    // Remove message if retry count exceeds limit
                    if (directMessageService._messageQueue[messageIndex].retryCount >= 5) {
                        directMessageService._messageQueue.splice(messageIndex, 1);
                    }
                }
            }
        }

        await directMessageService._saveQueueToStorage();
    },

    /**
     * Send a queued message
     */
    _sendQueuedMessage: async (queuedMessage: QueuedMessage): Promise<void> => {
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error('Not authenticated');

        const batch = writeBatch(db);

        // Add message
        const messageRef = doc(collection(db, 'direct_messages'));
        const messageData: Omit<DirectMessage, 'id'> = {
            conversationId: queuedMessage.conversationId,
            senderId: currentUser.uid,
            senderName: currentUser.displayName || 'User',
            senderAvatar: currentUser.photoURL || undefined,
            recipientId: queuedMessage.recipientId,
            recipientName: '',
            recipientAvatar: undefined,
            content: queuedMessage.content,
            type: queuedMessage.type,
            mediaUrl: queuedMessage.mediaUrl,
            read: false,
            createdAt: Timestamp.fromMillis(queuedMessage.timestamp)
        };

        batch.set(messageRef, messageData);

        // Update conversation
        const conversationRef = doc(db, 'direct_conversations', queuedMessage.conversationId);
        const conversationDoc = await getDoc(conversationRef);
        const currentUnreadCount = conversationDoc.data()?.unreadCount?.[queuedMessage.recipientId] || 0;
        
        batch.update(conversationRef, {
            lastMessage: {
                content: queuedMessage.content,
                senderId: currentUser.uid,
                createdAt: Timestamp.fromMillis(queuedMessage.timestamp)
            },
            [`unreadCount.${queuedMessage.recipientId}`]: currentUnreadCount + 1,
            updatedAt: serverTimestamp()
        });

        await batch.commit();
    },
    /**
     * Get current user ID
     */
    getCurrentUserId: (): string | null => {
        return auth.currentUser?.uid || null;
    },

    /**
     * Get or create a conversation between two users
     */
    getOrCreateConversation: async (otherUserId: string, otherUserName: string, otherUserAvatar?: string): Promise<string> => {
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) throw new Error('Not authenticated');

            const participants = [currentUser.uid, otherUserId].sort(); // Sort for consistent ID
            const conversationId = `${participants[0]}_${participants[1]}`;

            // Check if conversation exists
            const conversationRef = doc(db, 'direct_conversations', conversationId);
            const conversationDoc = await getDoc(conversationRef);

            if (!conversationDoc.exists()) {
                // Create new conversation
                const conversationData: Omit<DirectConversation, 'id'> = {
                    participants,
                    participantNames: [currentUser.displayName || 'User', otherUserName],
                    participantAvatars: [currentUser.photoURL || '', otherUserAvatar || ''],
                    unreadCount: {
                        [currentUser.uid]: 0,
                        [otherUserId]: 0
                    },
                    createdAt: Timestamp.now(),
                    updatedAt: Timestamp.now()
                };

                await updateDoc(conversationRef, conversationData);
            }

            return conversationId;
        } catch (error) {
            console.error('Error getting/creating conversation:', error);
            throw error;
        }
    },

    /**
     * Send a direct message with reliability features
     */
    sendMessage: async (conversationId: string, recipientId: string, content: string, type: 'text' | 'image' | 'document' = 'text', mediaUrl?: string): Promise<string> => {
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) throw new Error('Not authenticated');

            const localId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const timestamp = Date.now();

            // If offline, queue the message
            if (!directMessageService._isOnline) {
                const queuedMessage: QueuedMessage = {
                    localId,
                    conversationId,
                    recipientId,
                    content,
                    type,
                    mediaUrl,
                    timestamp,
                    retryCount: 0
                };

                directMessageService._messageQueue.push(queuedMessage);
                await directMessageService._saveQueueToStorage();
                
                return localId;
            }

            // Try to send immediately
            try {
                const batch = writeBatch(db);

                // Add message
                const messageRef = doc(collection(db, 'direct_messages'));
                const messageData: Omit<DirectMessage, 'id'> = {
                    conversationId,
                    senderId: currentUser.uid,
                    senderName: currentUser.displayName || 'User',
                    senderAvatar: currentUser.photoURL || undefined,
                    recipientId,
                    recipientName: '',
                    recipientAvatar: undefined,
                    content,
                    type,
                    mediaUrl,
                    read: false,
                    createdAt: Timestamp.fromMillis(timestamp)
                };

                batch.set(messageRef, messageData);

                // Update conversation
                const conversationRef = doc(db, 'direct_conversations', conversationId);
                const conversationDoc = await getDoc(conversationRef);
                const currentUnreadCount = conversationDoc.data()?.unreadCount?.[recipientId] || 0;
                
                batch.update(conversationRef, {
                    lastMessage: {
                        content,
                        senderId: currentUser.uid,
                        createdAt: Timestamp.fromMillis(timestamp)
                    },
                    [`unreadCount.${recipientId}`]: currentUnreadCount + 1,
                    updatedAt: serverTimestamp()
                });

                await batch.commit();
                return messageRef.id;
            } catch (error) {
                // If immediate send fails, queue the message
                console.warn('Immediate send failed, queuing message:', error);
                
                const queuedMessage: QueuedMessage = {
                    localId,
                    conversationId,
                    recipientId,
                    content,
                    type,
                    mediaUrl,
                    timestamp,
                    retryCount: 0
                };

                directMessageService._messageQueue.push(queuedMessage);
                await directMessageService._saveQueueToStorage();
                
                return localId;
            }
        } catch (error) {
            console.error('Error sending message:', error);
            throw error;
        }
    },

    /**
     * Set typing indicator
     */
    setTyping: async (conversationId: string, isTyping: boolean): Promise<void> => {
        try {
            const currentUser = auth.currentUser;
            if (!currentUser || !directMessageService._isOnline) return;

            const typingRef = doc(db, 'typing_indicators', `${conversationId}_${currentUser.uid}`);
            
            if (isTyping) {
                await updateDoc(typingRef, {
                    userId: currentUser.uid,
                    conversationId,
                    isTyping: true,
                    timestamp: serverTimestamp()
                });

                // Clear typing indicator after 3 seconds
                const timeoutKey = `${conversationId}_${currentUser.uid}`;
                if (directMessageService._typingTimeouts.has(timeoutKey)) {
                    clearTimeout(directMessageService._typingTimeouts.get(timeoutKey)!);
                }

                const timeout = setTimeout(() => {
                    directMessageService.setTyping(conversationId, false);
                    directMessageService._typingTimeouts.delete(timeoutKey);
                }, 3000);

                directMessageService._typingTimeouts.set(timeoutKey, timeout);
            } else {
                await updateDoc(typingRef, {
                    isTyping: false,
                    timestamp: serverTimestamp()
                });
            }
        } catch (error) {
            console.error('Error setting typing indicator:', error);
        }
    },

    /**
     * Listen for typing indicators
     */
    getTypingIndicators: (conversationId: string, callback: (typingUsers: string[]) => void) => {
        const currentUser = auth.currentUser;
        if (!currentUser) return () => {};

        const q = query(
            collection(db, 'typing_indicators'),
            where('conversationId', '==', conversationId),
            where('isTyping', '==', true)
        );

        return onSnapshot(q, (snapshot) => {
            const typingUsers = snapshot.docs
                .map(doc => doc.data() as TypingIndicator)
                .filter(indicator => indicator.userId !== currentUser.uid)
                .map(indicator => indicator.userId);
            
            callback(typingUsers);
        });
    },

    /**
     * Search messages within a conversation
     */
    searchMessages: async (conversationId: string, searchTerm: string): Promise<DirectMessage[]> => {
        try {
            const q = query(
                collection(db, 'direct_messages'),
                where('conversationId', '==', conversationId),
                orderBy('createdAt', 'desc'),
                limit(100)
            );

            const snapshot = await getDocs(q);
            const messages = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as DirectMessage));

            // Filter messages that contain the search term (case-insensitive)
            return messages.filter(message => 
                message.content.toLowerCase().includes(searchTerm.toLowerCase())
            );
        } catch (error) {
            console.error('Error searching messages:', error);
            return [];
        }
    },

    /**
     * Get message delivery status
     */
    getMessageStatus: async (messageId: string): Promise<'sent' | 'delivered' | 'read' | 'failed'> => {
        try {
            const messageRef = doc(db, 'direct_messages', messageId);
            const messageDoc = await getDoc(messageRef);
            
            if (!messageDoc.exists()) {
                return 'failed';
            }

            const data = messageDoc.data();
            if (data.readAt) return 'read';
            if (data.deliveredAt) return 'delivered';
            return 'sent';
        } catch (error) {
            console.error('Error getting message status:', error);
            return 'failed';
        }
    },

    /**
     * Mark message as delivered
     */
    markAsDelivered: async (messageId: string): Promise<void> => {
        try {
            const messageRef = doc(db, 'direct_messages', messageId);
            await updateDoc(messageRef, {
                deliveredAt: serverTimestamp()
            });
        } catch (error) {
            console.error('Error marking message as delivered:', error);
        }
    },

    /**
     * Get queued message count
     */
    getQueuedMessageCount: (): number => {
        return directMessageService._messageQueue.length;
    },

    /**
     * Get network status
     */
    isOnline: (): boolean => {
        return directMessageService._isOnline;
    },

    /**
     * Clear message queue (for testing/debugging)
     */
    clearQueue: async (): Promise<void> => {
        directMessageService._messageQueue = [];
        await directMessageService._saveQueueToStorage();
    },

    /**
     * Cleanup resources
     */
    cleanup: (): void => {
        if (directMessageService._retryInterval) {
            clearInterval(directMessageService._retryInterval);
            directMessageService._retryInterval = null;
        }

        // Clear all typing timeouts
        directMessageService._typingTimeouts.forEach(timeout => clearTimeout(timeout));
        directMessageService._typingTimeouts.clear();
    },

    /**
     * Get messages for a conversation
     */
    getMessages: (conversationId: string, callback: (messages: DirectMessage[]) => void) => {
        const q = query(
            collection(db, 'direct_messages'),
            where('conversationId', '==', conversationId),
            orderBy('createdAt', 'desc'),
            limit(50)
        );

        return onSnapshot(q, (snapshot) => {
            const messages = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as DirectMessage));
            
            callback(messages.reverse()); // Show oldest first
        });
    },

    /**
     * Get user's conversations
     */
    getConversations: (callback: (conversations: DirectConversation[]) => void) => {
        const currentUser = auth.currentUser;
        if (!currentUser) return () => {};

        const q = query(
            collection(db, 'direct_conversations'),
            where('participants', 'array-contains', currentUser.uid),
            orderBy('updatedAt', 'desc')
        );

        return onSnapshot(q, (snapshot) => {
            const conversations = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as DirectConversation));
            
            callback(conversations);
        });
    },

    /**
     * Mark messages as read with delivery confirmation
     */
    markAsRead: async (conversationId: string): Promise<void> => {
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) return;

            const batch = writeBatch(db);

            // Mark unread messages as read
            const messagesQuery = query(
                collection(db, 'direct_messages'),
                where('conversationId', '==', conversationId),
                where('recipientId', '==', currentUser.uid),
                where('read', '==', false)
            );

            const messagesSnapshot = await getDocs(messagesQuery);
            messagesSnapshot.docs.forEach(doc => {
                batch.update(doc.ref, {
                    read: true,
                    readAt: serverTimestamp()
                });
            });

            // Reset unread count
            const conversationRef = doc(db, 'direct_conversations', conversationId);
            batch.update(conversationRef, {
                [`unreadCount.${currentUser.uid}`]: 0
            });

            await batch.commit();
        } catch (error) {
            console.error('Error marking messages as read:', error);
        }
    },

    /**
     * Get total unread count for user
     */
    getTotalUnreadCount: (callback: (count: number) => void) => {
        const currentUser = auth.currentUser;
        if (!currentUser) return () => {};

        const q = query(
            collection(db, 'direct_conversations'),
            where('participants', 'array-contains', currentUser.uid)
        );

        return onSnapshot(q, (snapshot) => {
            let totalUnread = 0;
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                totalUnread += data.unreadCount?.[currentUser.uid] || 0;
            });
            
            callback(totalUnread);
        });
    }
};