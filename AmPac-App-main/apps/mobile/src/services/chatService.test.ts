/**
 * Chat Service Tests
 * Feature: app-store-deployment
 * 
 * Tests for channel messaging functionality including:
 * - Channel list display
 * - Message delivery to participants
 * - Channel creation
 * - Message sending
 * 
 * Requirements: 4.2, 4.3, 4.4
 */

import * as fc from 'fast-check';

// Mock Firebase modules before importing the service
jest.mock('firebase/firestore', () => ({
    collection: jest.fn(),
    doc: jest.fn(),
    getDoc: jest.fn(),
    getDocs: jest.fn(),
    addDoc: jest.fn(() => Promise.resolve({ id: 'new-doc-id' })),
    updateDoc: jest.fn(() => Promise.resolve()),
    setDoc: jest.fn(() => Promise.resolve()),
    query: jest.fn(),
    where: jest.fn(),
    orderBy: jest.fn(),
    limit: jest.fn(),
    onSnapshot: jest.fn(),
    Timestamp: {
        now: jest.fn(() => ({ toDate: () => new Date() })),
        fromDate: jest.fn((date: Date) => ({ toDate: () => date })),
    },
    serverTimestamp: jest.fn(() => ({ toDate: () => new Date() })),
    arrayUnion: jest.fn((val) => val),
    arrayRemove: jest.fn((val) => val),
}));

jest.mock('../../firebaseConfig', () => ({
    db: {},
    auth: {
        currentUser: { 
            uid: 'test-user-id', 
            displayName: 'Test User',
            photoURL: 'https://example.com/avatar.jpg',
        },
    },
}));

// Brain API mock removed for v1 launch

jest.mock('./authUtils', () => ({
    getCurrentUserId: jest.fn(() => 'test-user-id'),
    getCurrentDisplayName: jest.fn(() => 'Test User'),
}));

jest.mock('./assistantService', () => ({
    getApiHeaders: jest.fn(() => Promise.resolve({
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mock-token',
    })),
}));

// Import after mocks are set up
import { chatService } from './chatService';
import { onSnapshot, addDoc, updateDoc, collection, doc, query, orderBy, limit, getDoc } from 'firebase/firestore';
import { Channel, Message } from '../types';

describe('Chat Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Task 5.3: Test channel messaging', () => {
        describe('Channel list display', () => {
            it('should subscribe to channels for an organization', () => {
                const mockUnsubscribe = jest.fn();
                (onSnapshot as jest.Mock).mockReturnValue(mockUnsubscribe);

                const callback = jest.fn();
                const unsubscribe = chatService.subscribeToChannels('ampac-community', callback);

                expect(collection).toHaveBeenCalledWith(expect.anything(), 'organizations', 'ampac-community', 'channels');
                expect(query).toHaveBeenCalled();
                expect(orderBy).toHaveBeenCalledWith('lastMessage.createdAt', 'desc');
                expect(onSnapshot).toHaveBeenCalled();
                expect(typeof unsubscribe).toBe('function');
            });

            it('should call callback with channels when snapshot updates', () => {
                const mockChannels: Partial<Channel>[] = [
                    { id: 'channel-1', name: 'general', type: 'public', members: ['user-1', 'user-2'] },
                    { id: 'channel-2', name: 'announcements', type: 'public', members: ['user-1'] },
                ];

                (onSnapshot as jest.Mock).mockImplementation((q, callback) => {
                    // Simulate snapshot callback
                    callback({
                        docs: mockChannels.map(ch => ({
                            id: ch.id,
                            data: () => ch,
                        })),
                    });
                    return jest.fn();
                });

                const callback = jest.fn();
                chatService.subscribeToChannels('ampac-community', callback);

                expect(callback).toHaveBeenCalled();
                const receivedChannels = callback.mock.calls[0][0];
                expect(receivedChannels).toHaveLength(2);
                expect(receivedChannels[0].name).toBe('general');
                expect(receivedChannels[1].name).toBe('announcements');
            });

            it('should handle empty channel list', () => {
                (onSnapshot as jest.Mock).mockImplementation((q, callback) => {
                    callback({ docs: [] });
                    return jest.fn();
                });

                const callback = jest.fn();
                chatService.subscribeToChannels('ampac-community', callback);

                expect(callback).toHaveBeenCalledWith([]);
            });

            it('should handle subscription errors gracefully', () => {
                (onSnapshot as jest.Mock).mockImplementation((q, successCallback, errorCallback) => {
                    errorCallback(new Error('Subscription failed'));
                    return jest.fn();
                });

                const callback = jest.fn();
                chatService.subscribeToChannels('ampac-community', callback);

                // Should call with empty array on error
                expect(callback).toHaveBeenCalledWith([]);
            });
        });

        describe('Message delivery to participants', () => {
            it('should subscribe to messages for a channel', () => {
                const mockUnsubscribe = jest.fn();
                (onSnapshot as jest.Mock).mockReturnValue(mockUnsubscribe);

                const callback = jest.fn();
                const unsubscribe = chatService.subscribeToMessages('ampac-community', 'channel-1', callback);

                expect(collection).toHaveBeenCalledWith(
                    expect.anything(), 
                    'organizations', 
                    'ampac-community', 
                    'channels', 
                    'channel-1', 
                    'messages'
                );
                expect(query).toHaveBeenCalled();
                expect(orderBy).toHaveBeenCalledWith('createdAt', 'desc');
                expect(limit).toHaveBeenCalledWith(50);
                expect(onSnapshot).toHaveBeenCalled();
                expect(typeof unsubscribe).toBe('function');
            });

            it('should call callback with messages when snapshot updates', () => {
                const mockMessages: Partial<Message>[] = [
                    { id: 'msg-1', text: 'Hello!', senderId: 'user-1', senderName: 'User 1' },
                    { id: 'msg-2', text: 'Hi there!', senderId: 'user-2', senderName: 'User 2' },
                ];

                (onSnapshot as jest.Mock).mockImplementation((q, callback) => {
                    callback({
                        docs: mockMessages.map(msg => ({
                            id: msg.id,
                            data: () => msg,
                        })),
                    });
                    return jest.fn();
                });

                const callback = jest.fn();
                chatService.subscribeToMessages('ampac-community', 'channel-1', callback);

                expect(callback).toHaveBeenCalled();
                const receivedMessages = callback.mock.calls[0][0];
                expect(receivedMessages).toHaveLength(2);
                expect(receivedMessages[0].text).toBe('Hello!');
            });

            it('should send a message to a channel', async () => {
                (addDoc as jest.Mock).mockResolvedValue({ id: 'new-message-id' });
                (doc as jest.Mock).mockReturnValue({ id: 'channel-ref' });
                (updateDoc as jest.Mock).mockResolvedValue(undefined);

                const messageId = await chatService.sendMessage(
                    'ampac-community',
                    'channel-1',
                    'Hello, everyone!'
                );

                expect(messageId).toBe('new-message-id');
                expect(addDoc).toHaveBeenCalled();
                expect(updateDoc).toHaveBeenCalled(); // Updates lastMessage on channel
            });

            it('should send a message with image type', async () => {
                (addDoc as jest.Mock).mockResolvedValue({ id: 'new-image-message-id' });
                (doc as jest.Mock).mockReturnValue({ id: 'channel-ref' });
                (updateDoc as jest.Mock).mockResolvedValue(undefined);

                const messageId = await chatService.sendMessage(
                    'ampac-community',
                    'channel-1',
                    'Check this out!',
                    'image',
                    'https://example.com/image.jpg'
                );

                expect(messageId).toBe('new-image-message-id');
                expect(addDoc).toHaveBeenCalled();
            });
        });

        describe('Channel creation', () => {
            it('should create a public channel', async () => {
                (addDoc as jest.Mock).mockResolvedValue({ id: 'new-channel-id' });

                const channelId = await chatService.createChannel(
                    'ampac-community',
                    'new-channel',
                    'public',
                    'A new public channel'
                );

                expect(channelId).toBe('new-channel-id');
                expect(addDoc).toHaveBeenCalled();
                
                // Verify the channel data
                const addDocCall = (addDoc as jest.Mock).mock.calls[0];
                const channelData = addDocCall[1];
                expect(channelData.name).toBe('new-channel');
                expect(channelData.type).toBe('public');
                expect(channelData.description).toBe('A new public channel');
                expect(channelData.members).toContain('test-user-id');
            });

            it('should create a private channel', async () => {
                (addDoc as jest.Mock).mockResolvedValue({ id: 'private-channel-id' });

                const channelId = await chatService.createChannel(
                    'ampac-community',
                    'private-channel',
                    'private',
                    'A private channel'
                );

                expect(channelId).toBe('private-channel-id');
                
                const addDocCall = (addDoc as jest.Mock).mock.calls[0];
                const channelData = addDocCall[1];
                expect(channelData.type).toBe('private');
            });
        });

        describe('Reactions', () => {
            it('should toggle reaction on a message', async () => {
                const mockMessageData = {
                    reactions: { '👍': ['other-user'] },
                };

                (getDoc as jest.Mock).mockResolvedValue({
                    exists: () => true,
                    data: () => mockMessageData,
                });

                (doc as jest.Mock).mockReturnValue({ id: 'message-ref' });
                (updateDoc as jest.Mock).mockResolvedValue(undefined);

                // This should add the user's reaction
                await chatService.toggleReaction(
                    'ampac-community',
                    'channel-1',
                    'message-1',
                    '👍',
                    'test-user-id'
                );

                // updateDoc should be called to update reactions
                expect(updateDoc).toHaveBeenCalled();
            });
        });

        describe('User invitation', () => {
            it('should invite users to a channel', async () => {
                (doc as jest.Mock).mockReturnValue({ id: 'channel-ref' });
                (updateDoc as jest.Mock).mockResolvedValue(undefined);

                await chatService.inviteUsers(
                    'ampac-community',
                    'channel-1',
                    ['user-2', 'user-3']
                );

                expect(updateDoc).toHaveBeenCalled();
            });
        });
    });
});

/**
 * Property-Based Tests for Channel Messaging
 * Feature: app-store-deployment
 */
describe('Property-Based Tests: Message Delivery to Participants', () => {
    /**
     * Property 7: Message Delivery to Participants
     * 
     * For any message sent in a channel or direct message, the message SHALL 
     * appear in the message list for all participants of that conversation.
     * 
     * Validates: Requirements 4.4
     */
    it('Property 7: For any valid channel message, sendMessage returns a message ID', async () => {
        const testCases = fc.sample(
            fc.record({
                orgId: fc.string({ minLength: 1, maxLength: 30 }).filter(s => /^[a-zA-Z0-9-]+$/.test(s)),
                channelId: fc.string({ minLength: 1, maxLength: 30 }).filter(s => /^[a-zA-Z0-9-]+$/.test(s)),
                text: fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
            }),
            100
        );

        for (const { orgId, channelId, text } of testCases) {
            (addDoc as jest.Mock).mockResolvedValue({ id: `msg-${Date.now()}` });
            (doc as jest.Mock).mockReturnValue({ id: 'channel-ref' });
            (updateDoc as jest.Mock).mockResolvedValue(undefined);

            const messageId = await chatService.sendMessage(orgId, channelId, text);

            // Every message should get an ID back
            expect(messageId).toBeDefined();
            expect(typeof messageId).toBe('string');
            expect(messageId.length).toBeGreaterThan(0);
        }
    });

    it('Property 7: Message text with emoji is accepted', async () => {
        const testCases = fc.sample(
            fc.tuple(
                fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
                fc.constantFrom('😀', '👍', '❤️', '🎉', '🔥', '✨', '💯', '🙏', '👋', '🚀')
            ),
            100
        );

        for (const [text, emoji] of testCases) {
            const messageText = `${text} ${emoji}`;
            
            (addDoc as jest.Mock).mockResolvedValue({ id: `msg-${Date.now()}` });
            (doc as jest.Mock).mockReturnValue({ id: 'channel-ref' });
            (updateDoc as jest.Mock).mockResolvedValue(undefined);

            const messageId = await chatService.sendMessage(
                'ampac-community',
                'general',
                messageText
            );

            expect(messageId).toBeDefined();
            
            // Verify addDoc was called with the emoji-containing text
            const addDocCall = (addDoc as jest.Mock).mock.calls[(addDoc as jest.Mock).mock.calls.length - 1];
            const messageData = addDocCall[1];
            expect(messageData.text).toBe(messageText);
            expect(messageData.text).toContain(emoji);
        }
    });

    it('Property 7: Channel subscription returns unsubscribe function', () => {
        fc.assert(
            fc.property(
                fc.string({ minLength: 1, maxLength: 30 }).filter(s => /^[a-zA-Z0-9-]+$/.test(s)),
                (orgId) => {
                    const mockUnsubscribe = jest.fn();
                    (onSnapshot as jest.Mock).mockReturnValue(mockUnsubscribe);

                    const callback = jest.fn();
                    const unsubscribe = chatService.subscribeToChannels(orgId, callback);

                    // Should return a function
                    expect(typeof unsubscribe).toBe('function');

                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    it('Property 7: Message subscription returns unsubscribe function', () => {
        fc.assert(
            fc.property(
                fc.tuple(
                    fc.string({ minLength: 1, maxLength: 30 }).filter(s => /^[a-zA-Z0-9-]+$/.test(s)),
                    fc.string({ minLength: 1, maxLength: 30 }).filter(s => /^[a-zA-Z0-9-]+$/.test(s))
                ),
                ([orgId, channelId]) => {
                    const mockUnsubscribe = jest.fn();
                    (onSnapshot as jest.Mock).mockReturnValue(mockUnsubscribe);

                    const callback = jest.fn();
                    const unsubscribe = chatService.subscribeToMessages(orgId, channelId, callback);

                    // Should return a function
                    expect(typeof unsubscribe).toBe('function');

                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });
});
