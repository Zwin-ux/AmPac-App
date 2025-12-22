import React, { useEffect, useState, useRef } from 'react';
import {
    View,
    Text,
    FlatList,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Image,
    SafeAreaView,
    Modal,
    Alert
} from 'react-native';
import { Message } from '../../types';
import { chatService } from '../../services/chatService';
import { reportService } from '../../services/reportService';
import { auth } from '../../../firebaseConfig';
import { format } from 'date-fns';
import { AMPAC_STAFF } from '../../data/staff';
import { Ionicons } from '@expo/vector-icons';

interface ChatScreenProps {
    orgId: string;
    channelId: string;
    channelName: string;
    onBack: () => void;
}

export const ChatScreen: React.FC<ChatScreenProps> = ({ orgId, channelId, channelName, onBack }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const flatListRef = useRef<FlatList>(null);
    const currentUser = auth.currentUser;

    const [showInviteModal, setShowInviteModal] = useState(false);

    useEffect(() => {
        const unsubscribe = chatService.subscribeToMessages(orgId, channelId, (updatedMessages) => {
            setMessages(updatedMessages);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [orgId, channelId]);

    const handleSend = async () => {
        if (!inputText.trim()) return;
        setSending(true);
        const text = inputText;
        setInputText(''); // Optimistic clear

        try {
            await chatService.sendMessage(orgId, channelId, text);
        } catch (error) {
            console.error("Failed to send", error);
            setInputText(text); // Restore on failure
        } finally {
            setSending(false);
        }
    };

    const handleReaction = async (messageId: string, emoji: string) => {
        if (!currentUser) return;
        try {
            await chatService.toggleReaction(orgId, channelId, messageId, emoji, currentUser.uid);
        } catch (error) {
            console.error("Failed to react", error);
        }
    };

    const handleInvite = async (userId: string) => {
        try {
            await chatService.inviteUsers(orgId, channelId, [userId]);
            Alert.alert("Success", "User invited!");
            setShowInviteModal(false);
        } catch (error) {
            Alert.alert("Error", "Failed to invite user.");
        }
    };

    const handleLongPressMessage = (message: Message) => {
        if (message.senderId === currentUser?.uid) return; // Don't report self

        Alert.alert(
            "Message Options",
            "What would you like to do?",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Report Message", 
                    onPress: () => handleReport(message.id, 'message'),
                    style: 'destructive' 
                },
                {
                    text: "Block User",
                    onPress: () => handleBlock(message.senderId),
                    style: 'destructive'
                }
            ]
        );
    };

    const handleReport = async (targetId: string, type: 'message' | 'user') => {
        Alert.prompt(
            "Report Content",
            "Why are you reporting this? (e.g. spam, abusive)",
            async (reason) => {
                if (!reason) return;
                try {
                    await reportService.reportContent(targetId, type, reason);
                    Alert.alert("Thank you", "The content has been reported for review.");
                } catch (e) {
                    Alert.alert("Error", "Failed to submit report.");
                }
            }
        );
    };

    const handleBlock = async (userId: string) => {
        Alert.alert(
            "Block User",
            "Are you sure? You won't see messages from this user anymore.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Block",
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await reportService.blockUser(userId);
                            Alert.alert("Blocked", "User has been blocked.");
                            // ideally refresh messages to hide theirs
                        } catch (e) {
                            Alert.alert("Error", "Failed to block user.");
                        }
                    }
                }
            ]
        );
    };

    const renderMessage = ({ item, index }: { item: Message; index: number }) => {
        const isMe = item.senderId === currentUser?.uid;
        const showAvatar = !isMe && (index === messages.length - 1 || messages[index + 1]?.senderId !== item.senderId);

        return (
            <TouchableOpacity 
                activeOpacity={0.9} 
                onLongPress={() => handleLongPressMessage(item)}
            >
            <View style={[styles.messageRow, isMe ? styles.myMessageRow : styles.theirMessageRow]}>
                 {!isMe && (
                    <View style={styles.avatarContainer}>
                        {showAvatar ? (
                             item.senderAvatar ? (
                                <Image source={{ uri: item.senderAvatar }} style={styles.avatar} />
                             ) : (
                                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                                    <Text style={styles.avatarInitials}>{item.senderName.substring(0, 1)}</Text>
                                </View>
                             )
                        ) : <View style={styles.avatarSpacer} />}
                    </View>
                 )}
                
                <View style={[styles.bubble, isMe ? styles.myBubble : styles.theirBubble]}>
                    {!isMe && <Text style={styles.senderName}>{item.senderName}</Text>}
                    <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.theirMessageText]}>
                        {item.text}
                    </Text>
                    
                    <View style={styles.footer}>
                        <Text style={[styles.time, isMe ? styles.myTime : styles.theirTime]}>
                             {item.createdAt ? format(item.createdAt.toDate(), 'p') : '...'}
                        </Text>
                         {/* Reaction Bar (Mini) */}
                         <View style={styles.reactionContainer}>
                            {item.reactions && Object.entries(item.reactions).map(([emoji, uids]) => (
                                uids.length > 0 && (
                                    <TouchableOpacity 
                                        key={emoji} 
                                        style={[styles.reactionBadge, uids.includes(currentUser?.uid || '') && styles.reactionBadgeActive]}
                                        onPress={() => handleReaction(item.id, emoji)}
                                    >
                                        <Text style={styles.reactionText}>{emoji} {uids.length}</Text>
                                    </TouchableOpacity>
                                )
                            ))}
                            {/* Add reaction button (+ placeholder) */}
                            <TouchableOpacity 
                                style={styles.addReactionButton}
                                onPress={() => handleReaction(item.id, '👍')} // Hack for demo: fast like
                            >
                                <Text style={styles.addReactionText}>+</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backButton} accessibilityLabel="Go back" accessibilityRole="button">
                    <Ionicons name="arrow-back" size={24} color="#007AFF" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.headerTitle}>#{channelName}</Text>
                    <Text style={styles.headerSubtitle}>{messages.length} messages</Text>
                </View>
                <TouchableOpacity onPress={() => setShowInviteModal(true)} style={styles.headerActionButton} accessibilityLabel="Invite user">
                    <Ionicons name="person-add" size={24} color="#007AFF" />
                </TouchableOpacity>
            </View>

            {/* Invite Modal */}
            <Modal
                visible={showInviteModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowInviteModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Invite to #{channelName}</Text>
                            <TouchableOpacity onPress={() => setShowInviteModal(false)}>
                                <Ionicons name="close" size={24} color="#000" />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={AMPAC_STAFF}
                            keyExtractor={item => item.id}
                            renderItem={({ item }) => (
                                <TouchableOpacity 
                                    style={styles.inviteItem}
                                    onPress={() => handleInvite(item.id)}
                                >
                                    <View style={styles.inviteAvatar}>
                                        <Text style={{color:'#fff'}}>{item.name.charAt(0)}</Text>
                                    </View>
                                    <View>
                                        <Text style={styles.inviteName}>{item.name}</Text>
                                        <Text style={styles.inviteRole}>{item.title}</Text>
                                    </View>
                                    <Ionicons name="add-circle-outline" size={24} color="#007AFF" style={{marginLeft: 'auto'}} />
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </View>
            </Modal>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator />
                </View>
            ) : (
                <FlatList
                    ref={flatListRef}
                    data={messages} // Firestore desc order
                    renderItem={renderMessage}
                    keyExtractor={item => item.id}
                    inverted // Show latest at bottom
                    contentContainerStyle={styles.listContent}
                />
            )}

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.select({ ios: 0, android: 0 })}
            >
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        value={inputText}
                        onChangeText={setInputText}
                        placeholder={`Message #${channelName}`}
                        placeholderTextColor="#999"
                        multiline
                    />
                    <TouchableOpacity 
                        style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]} 
                        onPress={handleSend}
                        disabled={!inputText.trim() || sending}
                    >
                        <Text style={styles.sendButtonText}>Send</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    backButton: {
        paddingRight: 12,
        paddingVertical: 4,
    },
    backButtonText: {
        fontSize: 24,
        color: '#007AFF',
    },
    headerActionButton: {
        paddingLeft: 12,
        paddingVertical: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    headerSubtitle: {
        fontSize: 12,
        color: '#888',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        paddingVertical: 16,
        paddingHorizontal: 12,
    },
    messageRow: {
        marginVertical: 4,
        flexDirection: 'row',
        alignItems: 'flex-end',
    },
    myMessageRow: {
        justifyContent: 'flex-end',
    },
    theirMessageRow: {
        justifyContent: 'flex-start',
    },
    bubble: {
        maxWidth: '80%',
        padding: 12,
        borderRadius: 16,
    },
    myBubble: {
        backgroundColor: '#007AFF',
        borderBottomRightRadius: 4,
    },
    theirBubble: {
        backgroundColor: '#fff',
        borderBottomLeftRadius: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 1,
        elevation: 1,
    },
    messageText: {
        fontSize: 16,
        lineHeight: 20,
    },
    myMessageText: {
        color: '#fff',
    },
    theirMessageText: {
        color: '#000',
    },
    senderName: {
        fontSize: 12,
        color: '#999',
        marginBottom: 4,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 4,
        minWidth: 60,
    },
    time: {
        fontSize: 10,
    },
    myTime: {
        color: 'rgba(255,255,255,0.7)',
    },
    theirTime: {
        color: '#aaa',
    },
    avatarContainer: {
        width: 32,
        marginRight: 8,
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
    },
    avatarPlaceholder: {
        backgroundColor: '#ddd',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarInitials: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#666',
    },
    avatarSpacer: {
        width: 32,
    },
    inputContainer: {
        flexDirection: 'row',
        padding: 12,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#eee',
        alignItems: 'flex-end',
    },
    input: {
        flex: 1,
        backgroundColor: '#f0f2f5',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 10,
        maxHeight: 100,
        marginRight: 8,
        fontSize: 16,
    },
    sendButton: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: '#007AFF',
        borderRadius: 20,
    },
    sendButtonDisabled: {
        backgroundColor: '#ccc',
    },
    sendButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    reactionContainer: {
        flexDirection: 'row',
        marginTop: 4,
    },
    reactionBadge: {
        backgroundColor: '#f0f0f0',
        borderRadius: 12,
        paddingHorizontal: 6,
        paddingVertical: 2,
        marginRight: 4,
    },
    reactionBadgeActive: {
        backgroundColor: '#E3F2FD',
        borderWidth: 1,
        borderColor: '#007AFF',
    },
    reactionText: {
        fontSize: 10,
    },
    addReactionButton: {
        padding: 2,
        opacity: 0.5,
    },
    addReactionText: {
        fontSize: 12,
        color: '#555',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        height: '60%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    inviteItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    inviteAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#007AFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    inviteName: {
        fontSize: 16,
        fontWeight: '500',
    },
    inviteRole: {
        fontSize: 12,
        color: '#666',
    }
});
