import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Animated,
    Keyboard,
    Platform,
    FlatList,
    ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { assistantService } from '../services/assistantService';
// import { BlurView } from 'expo-blur'; // Removed to avoid dependency issues

interface ChatMessage {
    id: string;
    text: string;
    sender: 'user' | 'assistant';
}

interface SmartActionBarProps {
    context?: string;
}

export default function SmartActionBar({ context = 'home' }: SmartActionBarProps) {
    const [expanded, setExpanded] = useState(false);
    const [inputText, setInputText] = useState('');
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(false);

    const heightAnim = useRef(new Animated.Value(60)).current; // Start with bar height
    const flatListRef = useRef<FlatList>(null);

    useEffect(() => {
        Animated.timing(heightAnim, {
            toValue: expanded ? 500 : 80, // Expand to 500 or collapse to 80
            duration: 300,
            useNativeDriver: false,
        }).start();
    }, [expanded]);

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
        setExpanded(true); // Ensure expanded

        // Scroll to bottom
        setTimeout(() => flatListRef.current?.scrollToEnd(), 100);

        try {
            const responseText = await assistantService.chat(context, userMsg.text);
            const assistantMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                text: responseText,
                sender: 'assistant'
            };
            setMessages(prev => [...prev, assistantMsg]);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
            setTimeout(() => flatListRef.current?.scrollToEnd(), 100);
        }
    };

    const handleFocus = () => {
        setExpanded(true);
    };

    const handleCollapse = () => {
        setExpanded(false);
        Keyboard.dismiss();
    };

    return (
        <Animated.View style={[styles.container, { height: heightAnim }]}>
            {/* Header / Collapse Button (Only visible when expanded) */}
            {expanded && (
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>AmPac Intelligence</Text>
                    <TouchableOpacity onPress={handleCollapse} style={styles.closeButton}>
                        <Ionicons name="chevron-down" size={24} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                </View>
            )}

            {/* Chat Area (Only visible when expanded) */}
            {expanded && (
                <View style={styles.chatArea}>
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
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <Ionicons name="sparkles" size={32} color={theme.colors.primary} style={{ opacity: 0.5 }} />
                                <Text style={styles.emptyText}>How can I help you today?</Text>
                            </View>
                        }
                    />
                    {loading && (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="small" color={theme.colors.primary} />
                        </View>
                    )}
                </View>
            )}

            {/* Input Bar */}
            <View style={styles.inputBar}>
                <View style={styles.inputWrapper}>
                    <Ionicons name="sparkles" size={20} color={theme.colors.primary} style={styles.inputIcon} />
                    <TextInput
                        style={styles.input}
                        placeholder="Ask AmPac..."
                        placeholderTextColor={theme.colors.textSecondary}
                        value={inputText}
                        onChangeText={setInputText}
                        onFocus={handleFocus}
                        onSubmitEditing={handleSend}
                    />
                    {inputText.length > 0 ? (
                        <TouchableOpacity onPress={handleSend} style={styles.sendButton}>
                            <Ionicons name="arrow-up" size={20} color="#fff" />
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity style={styles.micButton}>
                            <Ionicons name="mic-outline" size={20} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 10,
        zIndex: 1000,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.lg,
        paddingTop: theme.spacing.md,
        paddingBottom: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    headerTitle: {
        ...theme.typography.h3 as any,
        fontSize: 16,
        color: theme.colors.primary,
    },
    closeButton: {
        padding: 4,
    },
    chatArea: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    listContent: {
        padding: theme.spacing.md,
    },
    messageBubble: {
        maxWidth: '85%',
        padding: 12,
        borderRadius: 16,
        marginBottom: 8,
    },
    userBubble: {
        alignSelf: 'flex-end',
        backgroundColor: theme.colors.primary,
        borderBottomRightRadius: 4,
    },
    assistantBubble: {
        alignSelf: 'flex-start',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderBottomLeftRadius: 4,
    },
    messageText: {
        fontSize: 15,
        lineHeight: 22,
    },
    userText: {
        color: '#fff',
    },
    assistantText: {
        color: theme.colors.text,
    },
    inputBar: {
        padding: theme.spacing.md,
        paddingBottom: Platform.OS === 'ios' ? 30 : theme.spacing.md, // Safe area
        backgroundColor: theme.colors.surface,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surfaceHighlight,
        borderRadius: 24,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    inputIcon: {
        marginRight: 8,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: theme.colors.text,
        height: 40,
    },
    sendButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    micButton: {
        padding: 4,
    },
    emptyState: {
        alignItems: 'center',
        marginTop: 40,
    },
    emptyText: {
        marginTop: 16,
        color: theme.colors.textSecondary,
        fontSize: 16,
    },
    loadingContainer: {
        padding: 10,
        alignItems: 'center',
    }
});
