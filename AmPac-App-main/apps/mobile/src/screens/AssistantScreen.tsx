import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { getErrorMessage, ErrorMessage } from '../copy/errors';
import { getFirebaseIdToken } from '../services/brainAuth';

type Message = {
    id: string;
    text: string;
    sender: 'user' | 'ai';
    timestamp: number;
};

import { useNavigation } from '@react-navigation/native';

export default function AssistantScreen() {
    const navigation = useNavigation();
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<ErrorMessage | null>(null);
    const flatListRef = useRef<FlatList>(null);

    useEffect(() => {
        // Initial greeting
        setMessages([
            {
                id: '1',
                text: "Hi there! I'm the AmPac Brain assistant. I can help you with questions about your loan application or required documents. How can I help you today?",
                sender: 'ai',
                timestamp: Date.now(),
            },
        ]);
    }, []);

    const handleSend = async () => {
        if (!inputText.trim()) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            text: inputText.trim(),
            sender: 'user',
            timestamp: Date.now(),
        };

        setMessages(prev => [...prev, userMsg]);
        setInputText('');
        setIsLoading(true);
        setError(null);

        try {
            const { API_URL } = await import('../config');
            const token = await getFirebaseIdToken();

            const response = await fetch(`${API_URL}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    messages: [
                        { role: 'system', content: "You are a helpful assistant for AmPac Business Capital." },
                        ...messages.map(m => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text })),
                        { role: 'user', content: userMsg.text }
                    ],
                    context: {
                        userRole: 'borrower',
                        screen: 'AssistantScreen'
                    },
                    stream: false
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Server error: ${response.status} - ${errorText}`);
            }

            const data = await response.json();

            // Handle both sync response formats (standard OpenAI or custom)
            let content = data.choices?.[0]?.message?.content || data.response || "I didn't get a response.";

            // Check for Action Tag
            const actionRegex = /<<<ACTION:(.*?)>>>/;
            const match = content.match(actionRegex);

            if (match) {
                try {
                    const actionJson = match[1];
                    const action = JSON.parse(actionJson);

                    // Remove tag from content
                    content = content.replace(match[0], '').trim();

                    // Execute Action
                    if (action.type === 'navigate') {
                        // Small delay to let user read message
                        setTimeout(() => {
                            // Use root navigation if possible, or assume we are in a tab navigator
                        }, 1500);
                    }
                } catch (e) {
                    // Silently fail for malformed actions
                }
            }

            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                text: content,
                sender: 'ai',
                timestamp: Date.now(),
            };
            setMessages(prev => [...prev, aiMsg]);

            // Execute Navigation after state update
            if (match) {
                try {
                    const action = JSON.parse(match[1]);
                    if (action.type === 'navigate' && action.target === 'Apply') {
                        setTimeout(() => {
                            // @ts-ignore
                            navigation.navigate('Apply');
                        }, 1000);
                    }
                } catch (e) { }
            }

        } catch (err) {
            setError(getErrorMessage('assistantUnavailable'));
        } finally {
            setIsLoading(false);
        }
    };

    const renderItem = ({ item }: { item: Message }) => {
        const isUser = item.sender === 'user';
        return (
            <View style={[
                styles.messageBubble,
                isUser ? styles.userBubble : styles.aiBubble
            ]}>
                <Text style={[
                    styles.messageText,
                    isUser ? styles.userText : styles.aiText
                ]}>{item.text}</Text>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>AmPac Assistant</Text>
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>BETA</Text>
                    </View>
                </View>

                <FlatList
                    ref={flatListRef}
                    data={messages}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                    onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
                />

                {error ? <ErrorBanner {...error} /> : null}

                <View style={styles.inputContainer}>
                    <View style={styles.inputWrapper}>
                        <TextInput
                            style={styles.input}
                            value={inputText}
                            onChangeText={setInputText}
                            placeholder="Type a message..."
                            placeholderTextColor={theme.colors.textSecondary}
                            multiline
                        />
                        <TouchableOpacity
                            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
                            onPress={handleSend}
                            disabled={!inputText.trim() || isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Ionicons name="arrow-up" size={20} color="#fff" />
                            )}
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.disclaimer}>
                        AmPac Brain can make mistakes. Please verify important info.
                    </Text>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    headerTitle: {
        ...theme.typography.h3,
        marginRight: theme.spacing.sm,
    },
    badge: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    badgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    listContent: {
        padding: theme.spacing.md,
        paddingBottom: theme.spacing.xl,
    },
    messageBubble: {
        maxWidth: '80%',
        padding: 12,
        borderRadius: 16,
        marginBottom: theme.spacing.sm,
    },
    userBubble: {
        alignSelf: 'flex-end',
        backgroundColor: theme.colors.primary,
        borderBottomRightRadius: 4,
    },
    aiBubble: {
        alignSelf: 'flex-start',
        backgroundColor: theme.colors.surfaceHighlight,
        borderBottomLeftRadius: 4,
    },
    messageText: {
        fontSize: 15,
        lineHeight: 22,
    },
    userText: {
        color: '#fff',
    },
    aiText: {
        color: theme.colors.text,
    },
    inputContainer: {
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        padding: theme.spacing.md,
        backgroundColor: theme.colors.surface,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        backgroundColor: theme.colors.surfaceHighlight,
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    input: {
        flex: 1,
        maxHeight: 100,
        fontSize: 16,
        color: theme.colors.text,
        paddingTop: 8,
        paddingBottom: 8,
    },
    sendButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
        marginBottom: 4,
    },
    sendButtonDisabled: {
        backgroundColor: theme.colors.textSecondary,
        opacity: 0.5,
    },
    disclaimer: {
        textAlign: 'center',
        fontSize: 11,
        color: theme.colors.textSecondary,
        marginTop: 8,
    }
});
