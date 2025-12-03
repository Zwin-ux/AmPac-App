import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, FlatList, ActivityIndicator, KeyboardAvoidingView, Platform, Animated } from 'react-native';
import { theme } from '../theme';
import { Ionicons } from '@expo/vector-icons';
import { assistantService } from '../services/assistantService';

interface AssistantBubbleProps {
    context: string; // e.g., 'application', 'home', 'spaces'
}

interface ChatMessage {
    id: string;
    text: string;
    sender: 'user' | 'assistant';
}

export default function AssistantBubble({ context }: AssistantBubbleProps) {
    const [expanded, setExpanded] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([
        { id: '1', text: getInitialGreeting(context), sender: 'assistant' }
    ]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(false);
    const flatListRef = useRef<FlatList>(null);

    function getInitialGreeting(ctx: string) {
        switch (ctx) {
            case 'application':
                return "Hi! I can help you with your loan application. Ask me about SBA 504 vs 7(a) or required documents.";
            case 'spaces':
                return "Looking for a workspace? I can help you find the right room or explain our membership perks.";
            case 'network':
                return "Welcome to the network! Ask me how to connect with other local businesses.";
            default:
                return "Hi! I'm the AmPac Smart Assistant. How can I help you today?";
        }
    }

    const handleSend = async () => {
        if (!inputText.trim()) return;

        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            text: inputText,
            sender: 'user'
        };

        setMessages(prev => [...prev, userMsg]);
        setInputText('');
        setLoading(true);

        // Scroll to bottom
        setTimeout(() => flatListRef.current?.scrollToEnd(), 100);

        const responseText = await assistantService.chat(context, userMsg.text);

        const assistantMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            text: responseText,
            sender: 'assistant'
        };

        setMessages(prev => [...prev, assistantMsg]);
        setLoading(false);
        setTimeout(() => flatListRef.current?.scrollToEnd(), 100);
    };

    if (expanded) {
        return (
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.expandedContainer}
            >
                <View style={styles.bubble}>
                    <View style={styles.header}>
                        <Text style={styles.headerText}>AmPac Assistant</Text>
                        <TouchableOpacity onPress={() => setExpanded(false)}>
                            <Ionicons name="close" size={20} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        keyExtractor={item => item.id}
                        renderItem={({ item }) => (
                            <View style={[
                                styles.messageBubble,
                                item.sender === 'user' ? styles.userBubble : styles.assistantBubble
                            ]}>
                                <Text style={[
                                    styles.messageText,
                                    item.sender === 'user' ? styles.userText : styles.assistantText
                                ]}>{item.text}</Text>
                            </View>
                        )}
                        contentContainerStyle={styles.listContent}
                    />

                    {loading && (
                        <View style={styles.typingIndicator}>
                            <ActivityIndicator size="small" color={theme.colors.primary} />
                            <Text style={styles.typingText}>Thinking...</Text>
                        </View>
                    )}

                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            value={inputText}
                            onChangeText={setInputText}
                            placeholder="Ask a question..."
                            placeholderTextColor={theme.colors.textSecondary}
                            onSubmitEditing={handleSend}
                        />
                        <TouchableOpacity onPress={handleSend} style={styles.sendButton}>
                            <Ionicons name="send" size={18} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        );
    }

    return (
        <TouchableOpacity style={styles.collapsedContainer} onPress={() => setExpanded(true)}>
            <View style={styles.iconBubble}>
                <Ionicons name="chatbubbles-outline" size={24} color={theme.colors.primary} />
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    collapsedContainer: {
        position: 'absolute',
        bottom: 90,
        right: 20,
        zIndex: 1000,
    },
    iconBubble: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: theme.colors.secondary, // Zinc 600 from theme
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)'
    },
    expandedContainer: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        left: 20,
        top: 100, // Leave space at top
        zIndex: 1000,
        justifyContent: 'flex-end',
    },
    bubble: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
        borderWidth: 1,
        borderColor: theme.colors.border,
        flex: 1, // Take available space in expandedContainer
        maxHeight: 500, // Cap height
        display: 'flex',
        flexDirection: 'column',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    headerText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.primary,
    },
    listContent: {
        padding: theme.spacing.md,
    },
    messageBubble: {
        maxWidth: '80%',
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.lg,
        marginBottom: theme.spacing.sm,
    },
    userBubble: {
        alignSelf: 'flex-end',
        backgroundColor: theme.colors.primary,
        borderBottomRightRadius: 2,
    },
    assistantBubble: {
        alignSelf: 'flex-start',
        backgroundColor: theme.colors.surfaceHighlight,
        borderBottomLeftRadius: 2,
    },
    messageText: {
        fontSize: 14,
        lineHeight: 20,
    },
    userText: {
        color: '#fff',
    },
    assistantText: {
        color: theme.colors.text,
    },
    inputContainer: {
        flexDirection: 'row',
        padding: theme.spacing.md,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        alignItems: 'center',
    },
    input: {
        flex: 1,
        backgroundColor: theme.colors.surfaceHighlight,
        borderRadius: theme.borderRadius.round,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        fontSize: 14,
        color: theme.colors.text,
        marginRight: theme.spacing.sm,
    },
    sendButton: {
        backgroundColor: theme.colors.primary,
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    typingIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.md,
        paddingBottom: theme.spacing.sm,
    },
    typingText: {
        marginLeft: 8,
        fontSize: 12,
        color: theme.colors.textSecondary,
    }
});
