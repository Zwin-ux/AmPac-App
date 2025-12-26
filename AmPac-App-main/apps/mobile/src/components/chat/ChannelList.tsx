import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Channel } from '../../types';
import { chatService } from '../../services/chatService';
import { auth } from '../../../firebaseConfig';
import { formatDistanceToNow } from 'date-fns';

interface ChannelListProps {
    orgId: string;
    onChannelSelect: (channel: Channel) => void;
}

export const ChannelList: React.FC<ChannelListProps> = ({ orgId, onChannelSelect }) => {
    const [channels, setChannels] = useState<Channel[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = chatService.subscribeToChannels(orgId, (updatedChannels) => {
            setChannels(updatedChannels);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [orgId]);

    const renderItem = ({ item }: { item: Channel }) => (
        <TouchableOpacity style={styles.channelItem} onPress={() => onChannelSelect(item)}>
            <View style={styles.channelIcon}>
                <Text style={styles.channelIconText}>
                    {item.type === 'public' ? '#' : '🔒'}
                </Text>
            </View>
            <View style={styles.channelInfo}>
                <Text style={styles.channelName}>{item.name}</Text>
                {item.lastMessage && (
                    <Text style={styles.lastMessage} numberOfLines={1}>
                        <Text style={styles.senderName}>{item.lastMessage.senderId === auth.currentUser?.uid ? 'You: ' : ''}</Text>
                        {item.lastMessage.text}
                    </Text>
                )}
            </View>
            {item.lastMessage && (
                <Text style={styles.timestamp}>
                    {item.lastMessage.createdAt ? formatDistanceToNow(item.lastMessage.createdAt.toDate(), { addSuffix: false }) : ''}
                </Text>
            )}
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="small" color="#000" />
            </View>
        );
    }

    if (channels.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No channels yet.</Text>
            </View>
        );
    }

    return (
        <FlatList
            data={channels}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
        />
    );
};

const styles = StyleSheet.create({
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        paddingVertical: 8,
    },
    channelItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: '#fff',
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#f0f0f0',
    },
    channelIcon: {
        width: 40,
        height: 40,
        borderRadius: 8,
        backgroundColor: '#f5f5f5',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    channelIconText: {
        fontSize: 18,
        color: '#666',
        fontWeight: 'bold',
    },
    channelInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    channelName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
        marginBottom: 4,
    },
    lastMessage: {
        fontSize: 14,
        color: '#888',
    },
    senderName: {
        fontWeight: '500',
        color: '#555',
    },
    timestamp: {
        fontSize: 12,
        color: '#aaa',
        marginLeft: 8,
    },
    emptyContainer: {
        padding: 24,
        alignItems: 'center',
    },
    emptyText: {
        color: '#888',
        fontSize: 16,
    },
});
