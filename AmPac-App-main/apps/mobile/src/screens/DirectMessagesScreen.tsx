import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { DirectMessage, DirectConversation } from '../types';
import { directMessageService } from '../services/directMessageService';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

interface DirectMessagesScreenProps {
    route?: {
        params?: {
            conversationId?: string;
            otherUserId?: string;
            otherUserName?: string;
            otherUserAvatar?: string;
        };
    };
}

export default function DirectMessagesScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const params = route.params as {
        conversationId?: string;
        otherUserId?: string;
        otherUserName?: string;
        otherUserAvatar?: string;
    } | undefined;

    const [view, setView] = useState<'list' | 'conversation'>('list');
    const [conversations, setConversations] = useState<DirectConversation[]>([]);
    const [messages, setMessages] = useState<DirectMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
    const [otherUserName, setOtherUserName] = useState<string>('');

    // If opened with specific conversation params, go directly to conversation
    useEffect(() => {
        if (params?.conversationId) {
            setCurrentConversationId(params.conversationId);
            setOtherUserName(params.otherUserName || 'User');
            setView('conversation');
        } else if (params?.otherUserId && params?.otherUserName) {
            // Create new conversation
            handleStartConversation(params.otherUserId, params.otherUserName, params.otherUserAvatar);
        }
    }, [params]);

    // Subscribe to conversations list
    useEffect(() => {
        if (view === 'list') {
            const unsubscribe = directMessageService.getConversations(setConversations);
            return unsubscribe;
        }
    }, [view]);

    // Subscribe to messages for current conversation
    useEffect(() => {
        if (currentConversationId && view === 'conversation') {
            const unsubscribe = directMessageService.getMessages(currentConversationId, setMessages);
            
            // Mark messages as read when viewing conversation
            directMessageService.markAsRead(currentConversationId);
            
            return unsubscribe;
        }
    }, [currentConversationId, view]);

    const handleStartConversation = async (otherUserId: string, otherUserName: string, otherUserAvatar?: string) => {
        try {
            const conversationId = await directMessageService.getOrCreateConversation(
                otherUserId, 
                otherUserName, 
                otherUserAvatar
            );
            setCurrentConversationId(conversationId);
            setOtherUserName(otherUserName);
            setView('conversation');
        } catch (error) {
            Alert.alert('Error', 'Failed to start conversation');
        }
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !currentConversationId) return;

        try {
            // Find the other participant
            const conversation = conversations.find(c => c.id === currentConversationId);
            if (!conversation) return;

            const otherUserId = conversation.participants.find(p => p !== directMessageService.getCurrentUserId?.());
            if (!otherUserId) return;

            await directMessageService.sendMessage(currentConversationId, otherUserId, newMessage.trim());
            setNewMessage('');
        } catch (error) {
            Alert.alert('Error', 'Failed to send message');
        }
    };

    const renderConversationItem = ({ item }: { item: DirectConversation }) => {
        const currentUserId = directMessageService.getCurrentUserId?.() || '';
        const otherUserIndex = item.participants[0] === currentUserId ? 1 : 0;
        const otherUserName = item.participantNames[otherUserIndex] || 'User';
        const unreadCount = item.unreadCount[currentUserId] || 0;

        return (
            <TouchableOpacity
                style={styles.conversationItem}
                onPress={() => {
                    setCurrentConversationId(item.id);
                    setOtherUserName(otherUserName);
                    setView('conversation');
                }}
            >
                <View style={styles.conversationAvatar}>
                    <Ionicons name="person-circle" size={48} color={theme.colors.primary} />
                </View>
                
                <View style={styles.conversationContent}>
                    <View style={styles.conversationHeader}>
                        <Text style={styles.conversationName}>{otherUserName}</Text>
                        {unreadCount > 0 && (
                            <View style={styles.unreadBadge}>
                                <Text style={styles.unreadText}>{unreadCount}</Text>
                            </View>
                        )}
                    </View>
                    
                    {item.lastMessage && (
                        <Text style={styles.lastMessage} numberOfLines={1}>
                            {item.lastMessage.content}
                        </Text>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    const renderMessage = ({ item }: { item: DirectMessage }) => {
        const isOwnMessage = item.senderId === directMessageService.getCurrentUserId?.();

        return (
            <View style={[
                styles.messageContainer,
                isOwnMessage ? styles.ownMessage : styles.otherMessage
            ]}>
                <View style={[
                    styles.messageBubble,
                    isOwnMessage ? styles.ownBubble : styles.otherBubble
                ]}>
                    <Text style={[
                        styles.messageText,
                        isOwnMessage ? styles.ownMessageText : styles.otherMessageText
                    ]}>
                        {item.content}
                    </Text>
                </View>
                
                <Text style={styles.messageTime}>
                    {item.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
            </View>
        );
    };

    if (view === 'conversation') {
        return (
            <SafeAreaView style={styles.container}>
                {/* Conversation Header */}
                <View style={styles.conversationHeader}>
                    <TouchableOpacity
                        onPress={() => setView('list')}
                        style={styles.backButton}
                    >
                        <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
                    </TouchableOpacity>
                    
                    <Text style={styles.conversationTitle}>{otherUserName}</Text>
                    
                    <View style={styles.headerSpacer} />
                </View>

                {/* Messages */}
                <FlatList
                    data={messages}
                    renderItem={renderMessage}
                    keyExtractor={(item) => item.id}
                    style={styles.messagesList}
                    contentContainerStyle={styles.messagesContent}
                    inverted={false}
                />

                {/* Message Input */}
                <View style={styles.messageInputContainer}>
                    <TextInput
                        style={styles.messageInput}
                        placeholder="Type a message..."
                        value={newMessage}
                        onChangeText={setNewMessage}
                        multiline
                        maxLength={500}
                    />
                    <TouchableOpacity
                        onPress={handleSendMessage}
                        style={[
                            styles.sendButton,
                            !newMessage.trim() && styles.sendButtonDisabled
                        ]}
                        disabled={!newMessage.trim()}
                    >
                        <Ionicons 
                            name="send" 
                            size={20} 
                            color={newMessage.trim() ? theme.colors.primary : theme.colors.textSecondary} 
                        />
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    // Conversations List View
    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Messages</Text>
            </View>

            {/* Conversations List */}
            {conversations.length > 0 ? (
                <FlatList
                    data={conversations}
                    renderItem={renderConversationItem}
                    keyExtractor={(item) => item.id}
                    style={styles.conversationsList}
                />
            ) : (
                <View style={styles.emptyState}>
                    <Ionicons name="chatbubbles-outline" size={64} color={theme.colors.textSecondary} />
                    <Text style={styles.emptyTitle}>No Messages Yet</Text>
                    <Text style={styles.emptySubtitle}>
                        Start conversations with other entrepreneurs in the community
                    </Text>
                    <Button
                        title="Browse Community"
                        onPress={() => navigation.navigate('SocialHub' as never)}
                        variant="secondary"
                        style={styles.browseButton}
                    />
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        padding: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    conversationHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
    },
    backButton: {
        marginRight: theme.spacing.md,
    },
    conversationTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
        flex: 1,
    },
    headerSpacer: {
        width: 24,
    },
    conversationsList: {
        flex: 1,
    },
    conversationItem: {
        flexDirection: 'row',
        padding: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
    },
    conversationAvatar: {
        marginRight: theme.spacing.md,
    },
    conversationContent: {
        flex: 1,
    },
    conversationName: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: 4,
    },
    lastMessage: {
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    unreadBadge: {
        backgroundColor: theme.colors.primary,
        borderRadius: 12,
        minWidth: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 8,
    },
    unreadText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
    messagesList: {
        flex: 1,
    },
    messagesContent: {
        padding: theme.spacing.md,
    },
    messageContainer: {
        marginBottom: theme.spacing.md,
    },
    ownMessage: {
        alignItems: 'flex-end',
    },
    otherMessage: {
        alignItems: 'flex-start',
    },
    messageBubble: {
        maxWidth: '80%',
        padding: theme.spacing.md,
        borderRadius: 16,
    },
    ownBubble: {
        backgroundColor: theme.colors.primary,
        borderBottomRightRadius: 4,
    },
    otherBubble: {
        backgroundColor: theme.colors.surface,
        borderBottomLeftRadius: 4,
    },
    messageText: {
        fontSize: 16,
        lineHeight: 20,
    },
    ownMessageText: {
        color: 'white',
    },
    otherMessageText: {
        color: theme.colors.text,
    },
    messageTime: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 4,
    },
    messageInputContainer: {
        flexDirection: 'row',
        padding: theme.spacing.md,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
        alignItems: 'flex-end',
    },
    messageInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 20,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        marginRight: theme.spacing.sm,
        maxHeight: 100,
        fontSize: 16,
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonDisabled: {
        opacity: 0.5,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing.xl,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginTop: theme.spacing.md,
        marginBottom: theme.spacing.sm,
    },
    emptySubtitle: {
        fontSize: 16,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginBottom: theme.spacing.lg,
        lineHeight: 22,
    },
    browseButton: {
        paddingHorizontal: theme.spacing.xl,
    },
});