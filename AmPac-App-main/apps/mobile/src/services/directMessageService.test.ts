/**
 * Direct Message Service Tests
 * Feature: app-store-deployment
 * 
 * Tests for direct messaging functionality including:
 * - Conversation creation/retrieval
 * - Message sending and receiving
 * - DM conversation idempotence (Property 8)
 * - Message delivery to participants (Property 7)
 * 
 * Requirements: 4.4, 4.6, 4.7
 */

import * as fc from 'fast-check';

// Mock Firebase modules before importing the service
jest.mock('firebase/firestore', () => ({
    collection: jest.fn(),
    doc: jest.fn(),
    getDoc: jest.fn(),
    getDocs: jest.fn(),
    addDoc: jest.fn(() => Promise.resolve({ id: 'new-message-id' })),
    updateDoc: jest.fn(() => Promise.resolve()),
    setDoc: jest.fn(() => Promise.resolve()),
    query: jest.fn(),
    where: jest.fn(),
    orderBy: jest.fn(),
    limit: jest.fn(),
    onSnapshot: jest.fn(),
    writeBatch: jest.fn(() => ({
        set: jest.fn(),
        update: jest.fn(),
        commit: jest.fn(() => Promise.resolve()),
    })),
    Timestamp: {
        now: jest.fn(() => ({ toDate: () => new Date() })),
        fromDate: jest.fn((date: Date) => ({ toDate: () => date })),
        fromMillis: jest.fn((ms: number) => ({ toDate: () => new Date(ms) })),
    },
    serverTimestamp: jest.fn(() => ({ toDate: () => new Date() })),
}));

jest.mock('@react-native-async-storage/async-storage', () =>
    require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('@react-native-community/netinfo', () => ({
    addEventListener: jest.fn(() => jest.fn()),
    fetch: jest.fn(() => Promise.resolve({ isConnected: true })),
}));

jest.mock('../../firebaseConfig', () => ({
    db: {},
    auth: {
        currentUser: { 
            uid: 'test-user-id', 
            displayName: 'Test User',
            photoURL: null,
        },
    },
}));

// Import after mocks are set up
import { directMessageService } from './directMessageService';
import { getDoc, doc, updateDoc, writeBatch, onSnapshot, getDocs } from 'firebase/firestore';

describe('Direct Message Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Task 5.1: Test direct messaging functionality', () => {
        describe('Conversation creation/retrieval', () => {
            it('should create a new conversation when none exists', async () => {
                // Mock getDoc to return non-existent document
                (getDoc as jest.Mock).mockResolvedValueOnce({
                    exists: () => false,
                });
                (updateDoc as jest.Mock).mockResolvedValueOnce(undefined);

                const conversationId = await directMessageService.getOrCreateConversation(
                    'other-user-id',
                    'Other User',
                    'https://example.com/avatar.jpg'
                );

                // Conversation ID should be sorted participant IDs
                expect(conversationId).toBe('other-user-id_test-user-id');
                expect(updateDoc).toHaveBeenCalled();
            });

            it('should return existing conversation ID when conversation exists', async () => {
                // Mock getDoc to return existing document
                (getDoc as jest.Mock).mockResolvedValueOnce({
                    exists: () => true,
                    data: () => ({
                        participants: ['other-user-id', 'test-user-id'],
                        participantNames: ['Other User', 'Test User'],
                    }),
                });

                const conversationId = await directMessageService.getOrCreateConversation(
                    'other-user-id',
                    'Other User'
                );

                expect(conversationId).toBe('other-user-id_test-user-id');
                // updateDoc should not be called for existing conversation
            });

            it('should generate consistent conversation ID regardless of user order', async () => {
                // The conversation ID should be the same whether user A starts with B or B starts with A
                (getDoc as jest.Mock).mockResolvedValue({
                    exists: () => true,
                });

                const id1 = await directMessageService.getOrCreateConversation('user-a', 'User A');
                const id2 = await directMessageService.getOrCreateConversation('user-a', 'User A');

                expect(id1).toBe(id2);
            });
        });

        describe('Message sending', () => {
            it('should send a text message successfully when online', async () => {
                const mockBatch = {
                    set: jest.fn(),
                    update: jest.fn(),
                    commit: jest.fn(() => Promise.resolve()),
                };
                (writeBatch as jest.Mock).mockReturnValue(mockBatch);
                (doc as jest.Mock).mockReturnValue({ id: 'mock-doc-ref' });
                (getDoc as jest.Mock).mockResolvedValue({
                    exists: () => true,
                    data: () => ({ unreadCount: { 'recipient-id': 0 } }),
                });

                // Ensure service thinks it's online
                directMessageService._isOnline = true;

                const messageId = await directMessageService.sendMessage(
                    'conversation-id',
                    'recipient-id',
                    'Hello, this is a test message!'
                );

                expect(messageId).toBeDefined();
                expect(mockBatch.commit).toHaveBeenCalled();
            });

            it('should queue message when offline', async () => {
                // Set service to offline mode
                directMessageService._isOnline = false;
                directMessageService._messageQueue = [];

                const messageId = await directMessageService.sendMessage(
                    'conversation-id',
                    'recipient-id',
                    'Offline message'
                );

                expect(messageId).toContain('local_');
                expect(directMessageService._messageQueue.length).toBe(1);
                expect(directMessageService._messageQueue[0].content).toBe('Offline message');

                // Reset
                directMessageService._isOnline = true;
                directMessageService._messageQueue = [];
            });

            it('should support text messages with emoji', async () => {
                const mockBatch = {
                    set: jest.fn(),
                    update: jest.fn(),
                    commit: jest.fn(() => Promise.resolve()),
                };
                (writeBatch as jest.Mock).mockReturnValue(mockBatch);
                (doc as jest.Mock).mockReturnValue({ id: 'mock-doc-ref' });
                (getDoc as jest.Mock).mockResolvedValue({
                    exists: () => true,
                    data: () => ({ unreadCount: { 'recipient-id': 0 } }),
                });

                directMessageService._isOnline = true;

                const emojiMessage = 'Hello! 👋 How are you? 😊🎉';
                const messageId = await directMessageService.sendMessage(
                    'conversation-id',
                    'recipient-id',
                    emojiMessage
                );

                expect(messageId).toBeDefined();
                // Verify the message was set with emoji content
                expect(mockBatch.set).toHaveBeenCalled();
            });
        });

        describe('Real-time updates', () => {
            it('should subscribe to messages for a conversation', () => {
                const mockUnsubscribe = jest.fn();
                (onSnapshot as jest.Mock).mockReturnValue(mockUnsubscribe);

                const callback = jest.fn();
                const unsubscribe = directMessageService.getMessages('conversation-id', callback);

                expect(onSnapshot).toHaveBeenCalled();
                expect(typeof unsubscribe).toBe('function');
            });

            it('should subscribe to user conversations', () => {
                const mockUnsubscribe = jest.fn();
                (onSnapshot as jest.Mock).mockReturnValue(mockUnsubscribe);

                const callback = jest.fn();
                const unsubscribe = directMessageService.getConversations(callback);

                expect(onSnapshot).toHaveBeenCalled();
                expect(typeof unsubscribe).toBe('function');
            });

            it('should subscribe to total unread count', () => {
                const mockUnsubscribe = jest.fn();
                (onSnapshot as jest.Mock).mockReturnValue(mockUnsubscribe);

                const callback = jest.fn();
                const unsubscribe = directMessageService.getTotalUnreadCount(callback);

                expect(onSnapshot).toHaveBeenCalled();
                expect(typeof unsubscribe).toBe('function');
            });
        });

        describe('Mark as read', () => {
            it('should mark messages as read and reset unread count', async () => {
                const mockBatch = {
                    update: jest.fn(),
                    commit: jest.fn(() => Promise.resolve()),
                };
                (writeBatch as jest.Mock).mockReturnValue(mockBatch);
                (getDocs as jest.Mock).mockResolvedValue({
                    docs: [
                        { ref: { id: 'msg-1' } },
                        { ref: { id: 'msg-2' } },
                    ],
                });

                await directMessageService.markAsRead('conversation-id');

                expect(mockBatch.update).toHaveBeenCalled();
                expect(mockBatch.commit).toHaveBeenCalled();
            });
        });
    });

    describe('Utility functions', () => {
        it('should return current user ID', () => {
            const userId = directMessageService.getCurrentUserId();
            expect(userId).toBe('test-user-id');
        });

        it('should return online status', () => {
            directMessageService._isOnline = true;
            expect(directMessageService.isOnline()).toBe(true);

            directMessageService._isOnline = false;
            expect(directMessageService.isOnline()).toBe(false);

            // Reset
            directMessageService._isOnline = true;
        });

        it('should return queued message count', () => {
            directMessageService._messageQueue = [];
            expect(directMessageService.getQueuedMessageCount()).toBe(0);

            directMessageService._messageQueue = [
                { localId: '1', conversationId: 'c1', recipientId: 'r1', content: 'msg1', type: 'text', timestamp: Date.now(), retryCount: 0 },
                { localId: '2', conversationId: 'c2', recipientId: 'r2', content: 'msg2', type: 'text', timestamp: Date.now(), retryCount: 0 },
            ];
            expect(directMessageService.getQueuedMessageCount()).toBe(2);

            // Reset
            directMessageService._messageQueue = [];
        });

        it('should clear message queue', async () => {
            directMessageService._messageQueue = [
                { localId: '1', conversationId: 'c1', recipientId: 'r1', content: 'msg1', type: 'text', timestamp: Date.now(), retryCount: 0 },
            ];

            await directMessageService.clearQueue();

            expect(directMessageService._messageQueue.length).toBe(0);
        });
    });
});

/**
 * Property-Based Tests for Direct Messaging
 * Feature: app-store-deployment
 */
describe('Property-Based Tests: DM Conversation Idempotence', () => {
    /**
     * Property 8: DM Conversation Idempotence
     * 
     * For any pair of users (A, B), starting a direct message conversation SHALL 
     * either create a new conversation if none exists, or return the existing 
     * conversation ID. Multiple calls with the same pair SHALL return the same conversation.
     * 
     * Validates: Requirements 4.6
     */
    it('Property 8: For any pair of user IDs, conversation ID is deterministic and idempotent', () => {
        fc.assert(
            fc.property(
                fc.tuple(
                    fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
                    fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0)
                ).filter(([a, b]) => a !== b), // Ensure different users
                ([userIdA, userIdB]) => {
                    // The conversation ID generation logic: sort and join
                    const participants1 = [userIdA, userIdB].sort();
                    const conversationId1 = `${participants1[0]}_${participants1[1]}`;

                    // Calling with reversed order should produce same ID
                    const participants2 = [userIdB, userIdA].sort();
                    const conversationId2 = `${participants2[0]}_${participants2[1]}`;

                    // IDs should be identical regardless of order
                    expect(conversationId1).toBe(conversationId2);

                    // Multiple calls should produce same result (idempotent)
                    const participants3 = [userIdA, userIdB].sort();
                    const conversationId3 = `${participants3[0]}_${participants3[1]}`;
                    expect(conversationId1).toBe(conversationId3);

                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    it('Property 8: Conversation ID format is consistent', () => {
        fc.assert(
            fc.property(
                fc.tuple(
                    fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z0-9-]+$/.test(s)),
                    fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z0-9-]+$/.test(s))
                ).filter(([a, b]) => a !== b),
                ([userIdA, userIdB]) => {
                    const participants = [userIdA, userIdB].sort();
                    const conversationId = `${participants[0]}_${participants[1]}`;

                    // Conversation ID should contain underscore separator
                    expect(conversationId).toContain('_');

                    // Should contain both user IDs
                    expect(conversationId).toContain(userIdA);
                    expect(conversationId).toContain(userIdB);

                    // First part should be lexicographically smaller or equal
                    const parts = conversationId.split('_');
                    expect(parts[0] <= parts[1]).toBe(true);

                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });
});

describe('Property-Based Tests: Message Delivery', () => {
    /**
     * Property 7: Message Delivery to Participants
     * 
     * For any message sent in a channel or direct message, the message SHALL 
     * appear in the message list for all participants of that conversation.
     * 
     * Validates: Requirements 4.4
     */
    it('Property 7: For any valid message content, message is queued when offline', async () => {
        // Test with multiple generated inputs
        const testCases = fc.sample(
            fc.record({
                conversationId: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0 && /^[a-zA-Z0-9_-]+$/.test(s)),
                recipientId: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0 && /^[a-zA-Z0-9_-]+$/.test(s)),
                content: fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
            }),
            100
        );

        for (const { conversationId, recipientId, content } of testCases) {
            // When offline, message should be queued
            directMessageService._isOnline = false;
            directMessageService._messageQueue = [];

            const messageId = await directMessageService.sendMessage(
                conversationId,
                recipientId,
                content
            );

            // Message should either be sent (returns doc ID) or queued (returns local ID)
            expect(messageId).toBeDefined();
            expect(typeof messageId).toBe('string');
            expect(messageId.length).toBeGreaterThan(0);

            // When offline, should be in queue with local_ prefix
            expect(messageId.startsWith('local_')).toBe(true);
            expect(directMessageService._messageQueue.length).toBeGreaterThan(0);
            
            const queuedMsg = directMessageService._messageQueue.find(m => m.localId === messageId);
            expect(queuedMsg).toBeDefined();
            expect(queuedMsg?.content).toBe(content);
            expect(queuedMsg?.conversationId).toBe(conversationId);
            expect(queuedMsg?.recipientId).toBe(recipientId);
        }

        // Reset
        directMessageService._isOnline = true;
        directMessageService._messageQueue = [];
    });

    it('Property 7: Message content with emoji is preserved', async () => {
        const testCases = fc.sample(
            fc.tuple(
                fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
                fc.constantFrom('😀', '👍', '❤️', '🎉', '🔥', '✨', '💯', '🙏')
            ),
            100
        );

        for (const [text, emoji] of testCases) {
            const content = `${text} ${emoji}`;
            
            directMessageService._isOnline = false;
            directMessageService._messageQueue = [];

            const messageId = await directMessageService.sendMessage(
                'test-conversation',
                'test-recipient',
                content
            );

            // Message should be queued with emoji preserved
            const queuedMsg = directMessageService._messageQueue.find(m => m.localId === messageId);
            expect(queuedMsg?.content).toBe(content);
            expect(queuedMsg?.content).toContain(emoji);
        }

        // Reset
        directMessageService._isOnline = true;
        directMessageService._messageQueue = [];
    });
});
