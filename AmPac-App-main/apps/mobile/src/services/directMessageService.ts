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
    serverTimestamp,
    setDoc
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
     * Create a private chat room with enhanced privacy features
     */
    createPrivateChat: async (participantIds: string[], chatName?: string, isEncrypted: boolean = false): Promise<string> => {
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) throw new Error('Not authenticated');

            // Ensure current user is included
            const allParticipants = Array.from(new Set([currentUser.uid, ...participantIds]));
            
            if (allParticipants.length < 2) {
                throw new Error('Private chat requires at least 2 participants');
            }

            const chatId = `private_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            const chatData: any = {
                id: chatId,
                type: 'private',
                participants: allParticipants,
                participantNames: [] as string[],
                participantAvatars: [] as string[],
                name: chatName || `Private Chat`,
                isEncrypted,
                createdBy: currentUser.uid,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
                lastMessage: null,
                unreadCount: Object.fromEntries(allParticipants.map(id => [id, 0])),
                settings: {
                    allowInvites: false,
                    messageRetention: 30, // days
                    readReceipts: true,
                    typingIndicators: true
                }
            };

            // Populate participant names and avatars
            for (const participantId of allParticipants) {
                if (participantId === currentUser.uid) {
                    chatData.participantNames.push(currentUser.displayName || 'User');
                    chatData.participantAvatars.push(currentUser.photoURL || '');
                } else {
                    const userDoc = await getDoc(doc(db, 'users', participantId));
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        chatData.participantNames.push(userData.fullName || userData.displayName || 'User');
                        chatData.participantAvatars.push(userData.photoURL || '');
                    } else {
                        chatData.participantNames.push('Unknown User');
                        chatData.participantAvatars.push('');
                    }
                }
            }

            await setDoc(doc(db, 'private_chats', chatId), chatData);
            return chatId;
        } catch (error) {
            console.error('Error creating private chat:', error);
            throw error;
        }
    },

    /**
     * Send message to private chat with enhanced privacy
     */
    sendPrivateMessage: async (chatId: string, content: string, type: 'text' | 'image' | 'document' = 'text', mediaUrl?: string, isEphemeral: boolean = false): Promise<string> => {
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) throw new Error('Not authenticated');

            const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const timestamp = Date.now();

            // Check if user is participant in the chat
            const chatRef = doc(db, 'private_chats', chatId);
            const chatDoc = await getDoc(chatRef);
            
            if (!chatDoc.exists()) {
                throw new Error('Private chat not found');
            }

            const chatData = chatDoc.data();
            if (!chatData.participants.includes(currentUser.uid)) {
                throw new Error('Not authorized to send messages to this chat');
            }

            const messageData = {
                id: messageId,
                chatId,
                senderId: currentUser.uid,
                senderName: currentUser.displayName || 'User',
                senderAvatar: currentUser.photoURL || undefined,
                content: isEphemeral ? '[Ephemeral Message]' : content,
                originalContent: content, // Store original for ephemeral cleanup
                type,
                mediaUrl,
                isEphemeral,
                expiresAt: isEphemeral ? Timestamp.fromMillis(timestamp + 24 * 60 * 60 * 1000) : null, // 24 hours
                read: false,
                readBy: [currentUser.uid], // Sender has read it
                createdAt: Timestamp.fromMillis(timestamp),
                reactions: {},
                isEdited: false,
                editHistory: []
            };

            // If offline, queue the message
            if (!directMessageService._isOnline) {
                const queuedMessage: QueuedMessage = {
                    localId: messageId,
                    conversationId: chatId,
                    recipientId: '', // Will be handled differently for private chats
                    content,
                    type,
                    mediaUrl,
                    timestamp,
                    retryCount: 0
                };

                directMessageService._messageQueue.push(queuedMessage);
                await directMessageService._saveQueueToStorage();
                return messageId;
            }

            const batch = writeBatch(db);

            // Add message
            const messageRef = doc(db, 'private_messages', messageId);
            batch.set(messageRef, messageData);

            // Update chat last message and unread counts
            const otherParticipants = chatData.participants.filter((id: string) => id !== currentUser.uid);
            const unreadUpdates: Record<string, number> = {};
            
            for (const participantId of otherParticipants) {
                const currentUnread = chatData.unreadCount[participantId] || 0;
                unreadUpdates[`unreadCount.${participantId}`] = currentUnread + 1;
            }

            batch.update(chatRef, {
                lastMessage: {
                    content: isEphemeral ? '[Ephemeral Message]' : content,
                    senderId: currentUser.uid,
                    createdAt: Timestamp.fromMillis(timestamp),
                    type
                },
                ...unreadUpdates,
                updatedAt: serverTimestamp()
            });

            await batch.commit();
            return messageId;
        } catch (error) {
            console.error('Error sending private message:', error);
            throw error;
        }
    },

    /**
     * Get private chat messages with enhanced features
     */
    getPrivateMessages: (chatId: string, callback: (messages: any[]) => void) => {
        const currentUser = auth.currentUser;
        if (!currentUser) return () => {};

        const q = query(
            collection(db, 'private_messages'),
            where('chatId', '==', chatId),
            orderBy('createdAt', 'desc'),
            limit(50)
        );

        return onSnapshot(q, (snapshot) => {
            const messages = snapshot.docs.map(doc => {
                const data = doc.data();
                
                // Filter out expired ephemeral messages
                if (data.isEphemeral && data.expiresAt && data.expiresAt.toMillis() < Date.now()) {
                    return null;
                }
                
                return {
                    id: doc.id,
                    ...data
                };
            }).filter(Boolean);
            
            callback(messages.reverse()); // Show oldest first
        });
    },

    /**
     * Add reaction to private message
     */
    addReaction: async (messageId: string, emoji: string): Promise<void> => {
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) throw new Error('Not authenticated');

            const messageRef = doc(db, 'private_messages', messageId);
            const messageDoc = await getDoc(messageRef);
            
            if (!messageDoc.exists()) {
                throw new Error('Message not found');
            }

            const messageData = messageDoc.data();
            const reactions = messageData.reactions || {};
            
            if (!reactions[emoji]) {
                reactions[emoji] = [];
            }
            
            // Toggle reaction
            if (reactions[emoji].includes(currentUser.uid)) {
                reactions[emoji] = reactions[emoji].filter((uid: string) => uid !== currentUser.uid);
                if (reactions[emoji].length === 0) {
                    delete reactions[emoji];
                }
            } else {
                reactions[emoji].push(currentUser.uid);
            }

            await updateDoc(messageRef, { reactions });
        } catch (error) {
            console.error('Error adding reaction:', error);
            throw error;
        }
    },

    /**
     * Edit private message
     */
    editMessage: async (messageId: string, newContent: string): Promise<void> => {
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) throw new Error('Not authenticated');

            const messageRef = doc(db, 'private_messages', messageId);
            const messageDoc = await getDoc(messageRef);
            
            if (!messageDoc.exists()) {
                throw new Error('Message not found');
            }

            const messageData = messageDoc.data();
            
            // Only sender can edit their message
            if (messageData.senderId !== currentUser.uid) {
                throw new Error('Not authorized to edit this message');
            }

            // Can't edit ephemeral messages
            if (messageData.isEphemeral) {
                throw new Error('Cannot edit ephemeral messages');
            }

            const editHistory = messageData.editHistory || [];
            editHistory.push({
                content: messageData.content,
                editedAt: Timestamp.now()
            });

            await updateDoc(messageRef, {
                content: newContent,
                isEdited: true,
                editHistory,
                lastEditedAt: serverTimestamp()
            });
        } catch (error) {
            console.error('Error editing message:', error);
            throw error;
        }
    },

    /**
     * Delete private message
     */
    deletePrivateMessage: async (messageId: string, deleteForEveryone: boolean = false): Promise<void> => {
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) throw new Error('Not authenticated');

            const messageRef = doc(db, 'private_messages', messageId);
            const messageDoc = await getDoc(messageRef);
            
            if (!messageDoc.exists()) {
                throw new Error('Message not found');
            }

            const messageData = messageDoc.data();
            
            if (deleteForEveryone) {
                // Only sender can delete for everyone within 1 hour
                if (messageData.senderId !== currentUser.uid) {
                    throw new Error('Not authorized to delete this message for everyone');
                }
                
                const messageAge = Date.now() - messageData.createdAt.toMillis();
                if (messageAge > 60 * 60 * 1000) { // 1 hour
                    throw new Error('Cannot delete message for everyone after 1 hour');
                }
                
                // Delete the message document
                const { deleteDoc: deleteDocFn } = await import('firebase/firestore');
                await deleteDocFn(messageRef);
            } else {
                // Delete for current user only
                const deletedFor = messageData.deletedFor || [];
                if (!deletedFor.includes(currentUser.uid)) {
                    deletedFor.push(currentUser.uid);
                    await updateDoc(messageRef, { deletedFor });
                }
            }
        } catch (error) {
            console.error('Error deleting private message:', error);
            throw error;
        }
    },

    /**
     * Get user's private chats
     */
    getPrivateChats: (callback: (chats: any[]) => void) => {
        const currentUser = auth.currentUser;
        if (!currentUser) return () => {};

        const q = query(
            collection(db, 'private_chats'),
            where('participants', 'array-contains', currentUser.uid),
            orderBy('updatedAt', 'desc')
        );

        return onSnapshot(q, (snapshot) => {
            const chats = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            callback(chats);
        });
    },

    /**
     * Leave private chat
     */
    leavePrivateChat: async (chatId: string): Promise<void> => {
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) throw new Error('Not authenticated');

            const chatRef = doc(db, 'private_chats', chatId);
            const chatDoc = await getDoc(chatRef);
            
            if (!chatDoc.exists()) {
                throw new Error('Private chat not found');
            }

            const chatData = chatDoc.data();
            const updatedParticipants = chatData.participants.filter((id: string) => id !== currentUser.uid);
            
            if (updatedParticipants.length === 0) {
                // Delete chat if no participants left
                const { deleteDoc: deleteDocFn } = await import('firebase/firestore');
                await deleteDocFn(chatRef);
            } else {
                // Remove user from participants
                await updateDoc(chatRef, {
                    participants: updatedParticipants,
                    updatedAt: serverTimestamp()
                });
            }
        } catch (error) {
            console.error('Error leaving private chat:', error);
            throw error;
        }
    },

    /**
     * Clean up expired ephemeral messages
     */
    cleanupEphemeralMessages: async (): Promise<void> => {
        try {
            const now = Timestamp.now();
            const expiredQuery = query(
                collection(db, 'private_messages'),
                where('isEphemeral', '==', true),
                where('expiresAt', '<=', now)
            );

            const expiredMessages = await getDocs(expiredQuery);
            const batch = writeBatch(db);

            expiredMessages.docs.forEach(doc => {
                batch.delete(doc.ref);
            });

            if (expiredMessages.docs.length > 0) {
                await batch.commit();
                console.log(`Cleaned up ${expiredMessages.docs.length} expired ephemeral messages`);
            }
        } catch (error) {
            console.error('Error cleaning up ephemeral messages:', error);
        }
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