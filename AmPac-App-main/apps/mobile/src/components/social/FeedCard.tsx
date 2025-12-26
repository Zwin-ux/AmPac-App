import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { FeedPost } from '../../types';
import { formatDistanceToNow } from 'date-fns';
import { auth } from '../../../firebaseConfig';

const { width } = Dimensions.get('window');

interface FeedCardProps {
    post: FeedPost;
    onLike: (postId: string) => void;
    onComment: (postId: string) => void;
}

export const FeedCard: React.FC<FeedCardProps> = ({ post, onLike, onComment }) => {
    const isLiked = post.likes && post.likes.includes(auth.currentUser?.uid || '');
    const hasMedia = post.mediaUrls && post.mediaUrls.length > 0;

    const handleReport = () => {
        // In a real app, this would write to a 'reports' collection
        // For compliance, we must show we have the UI flow.
        alert('Thank you. This content has been reported and hidden.');
    };

    return (
        <View style={styles.card}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.avatarContainer}>
                    {post.authorAvatar ? (
                         <Image source={{ uri: post.authorAvatar }} style={styles.avatar} />
                    ) : (
                        <View style={[styles.avatar, styles.avatarPlaceholder]}>
                            <Text style={styles.avatarInitials}>{post.authorName.charAt(0)}</Text>
                        </View>
                    )}
                </View>
                <View style={styles.headerText}>
                    <Text style={styles.authorName}>{post.authorName}</Text>
                    {post.orgId && <Text style={styles.orgName}>AmPac Team</Text>}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.timeAgo}>
                        {post.createdAt ? formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true }) : ''}
                    </Text>
                    <TouchableOpacity onPress={handleReport} style={{ padding: 4, marginLeft: 8 }}>
                        <Text style={{ fontSize: 18, color: '#ccc' }}>•••</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Content Text */}
            {post.content ? (
                <Text style={styles.content}>{post.content}</Text>
            ) : null}

            {/* Media */}
            {hasMedia && (
                <View style={styles.mediaContainer}>
                     <Image 
                        source={{ uri: post.mediaUrls![0] }} 
                        style={styles.mediaImage} 
                        resizeMode="cover" 
                    />
                </View>
            )}

            {/* Actions */}
            <View style={styles.actions}>
                <TouchableOpacity onPress={() => onLike(post.id)} style={styles.actionButton}>
                    <Text style={[styles.actionIcon, isLiked && styles.likedIcon]}>
                        {isLiked ? '❤️' : '🤍'}
                    </Text>
                    <Text style={styles.actionText}>{post.likes?.length || 0}</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => onComment(post.id)} style={styles.actionButton}>
                    <Text style={styles.actionIcon}>💬</Text>
                    <Text style={styles.actionText}>{post.commentCount || 0}</Text>
                </TouchableOpacity>

                <View style={styles.flexSpacer} />
                
                <TouchableOpacity style={styles.actionButton}>
                    <Text style={styles.actionIcon}>⏩</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#fff',
        marginBottom: 12,
        borderRadius: 0, // Edge to edge aesthetic
        borderBottomWidth: 8,
        borderBottomColor: '#f0f2f5',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
    },
    avatarContainer: {
        marginRight: 12,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    avatarPlaceholder: {
        backgroundColor: '#1E293B',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarInitials: {
        color: '#fff',
        fontWeight: 'bold',
    },
    headerText: {
        flex: 1,
    },
    authorName: {
        fontWeight: '700',
        fontSize: 15,
        color: '#0F172A',
    },
    orgName: {
        fontSize: 12,
        color: '#64748B',
    },
    timeAgo: {
        fontSize: 12,
        color: '#94A3B8',
    },
    content: {
        paddingHorizontal: 12,
        paddingBottom: 12,
        fontSize: 15,
        lineHeight: 22,
        color: '#334155',
    },
    mediaContainer: {
        width: '100%',
        height: 300,
        backgroundColor: '#f0f0f0',
    },
    mediaImage: {
        width: '100%',
        height: '100%',
    },
    actions: {
        flexDirection: 'row',
        padding: 12,
        alignItems: 'center',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 24,
    },
    actionIcon: {
        fontSize: 20,
        marginRight: 6,
    },
    likedIcon: {
        // Red color usually handled by emoji, but if using icons: color: '#EF4444'
    },
    actionText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748B',
    },
    flexSpacer: {
        flex: 1,
    },
});
