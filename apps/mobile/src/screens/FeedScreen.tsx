import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, StyleSheet, SafeAreaView, ScrollView, TextInput, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { feedService } from '../services/feedService';
import { notificationService } from '../services/notificationService';
import { auth } from '../../firebaseConfig';
import type { FeedPost } from '../types';
import CommentSection from '../components/CommentSection';

const primaryBlue = "#0064A6";

export default function FeedScreen({ navigation }: any) {
    const [loading, setLoading] = useState(true);
    const [feedItems, setFeedItems] = useState<FeedPost[]>([]);
    const [newPostContent, setNewPostContent] = useState('');
    const [creatingPost, setCreatingPost] = useState(false);
    const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());

    useEffect(() => {
        const unsubscribe = feedService.subscribeToFeed(50, (posts) => {
            setFeedItems(posts);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleCreatePost = async () => {
        if (!newPostContent.trim()) {
            Alert.alert("Error", "Post content cannot be empty.");
            return;
        }

        try {
            setCreatingPost(true);
            await feedService.createPost(newPostContent, 'announcement');
            setNewPostContent('');
        } catch (error) {
            console.error('Error creating post:', error);
            Alert.alert("Error", "Failed to create post.");
        } finally {
            setCreatingPost(false);
        }
    };

    const handleLikePost = async (postId: string) => {
        try {
            const uid = auth.currentUser?.uid;
            if (!uid) {
                Alert.alert("Sign in required", "Please sign in to like posts.");
                return;
            }
            await feedService.toggleLike(postId);

            // Send like notification
            const post = feedItems.find(p => p.id === postId);
            if (post && post.authorId !== uid) {
                await notificationService.sendLikeNotification(
                    post.authorId,
                    auth.currentUser?.displayName || 'Someone',
                    postId
                );
            }

            setFeedItems((prev) =>
                prev.map((item) => {
                    if (item.id !== postId) return item;
                    const liked = item.likes?.includes(uid);
                    const nextLikes = liked ? item.likes.filter((x) => x !== uid) : [...(item.likes || []), uid];
                    return { ...item, likes: nextLikes };
                })
            );
        } catch (error) {
            console.error('Error liking post:', error);
        }
    };

    const getPostTypeIcon = (type: FeedPost['type']) => {
        const icons = {
            announcement: { name: 'megaphone-outline', color: '#64748B' },
            showcase: { name: 'image-outline', color: '#8B5CF6' },
            qa: { name: 'help-circle-outline', color: '#3B82F6' },
        };
        return icons[type] || { name: 'megaphone-outline', color: '#64748B' };
    };

    const formatTimeAgo = (date: Date) => {
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        return `${Math.floor(diffInSeconds / 86400)}d ago`;
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={[styles.container, styles.center]}>
                    <ActivityIndicator size="large" color={primaryBlue} />
                    <Text style={styles.loadingText}>Loading feed...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
                    </TouchableOpacity>
                    <Text style={styles.title}>Community Feed</Text>
                    <Text style={styles.subtitle}>Connect with other entrepreneurs</Text>
                </View>

                {/* Create Post Section */}
                <View style={styles.createPostCard}>
                    <Text style={styles.sectionTitle}>Share an Update</Text>
                    <TextInput
                        style={styles.postInput}
                        value={newPostContent}
                        onChangeText={setNewPostContent}
                        placeholder="What's on your mind? Share your business journey..."
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                    />
                    <TouchableOpacity
                        style={[styles.postButton, creatingPost && { opacity: 0.7 }]}
                        onPress={handleCreatePost}
                        disabled={creatingPost || !newPostContent.trim()}
                    >
                        {creatingPost ? (
                            <ActivityIndicator color="white" size="small" />
                        ) : (
                            <Text style={styles.postButtonText}>Post Update</Text>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Feed Items */}
                <View style={styles.feedContainer}>
                    <Text style={styles.sectionTitle}>Recent Activity</Text>
                    {feedItems.length > 0 ? (
                        feedItems.map((item) => (
                            <View key={item.id} style={styles.feedItem}>
                                <View style={styles.feedHeader}>
                                    <View style={styles.userInfo}>
                                        {item.authorAvatar ? (
                                            <Image source={{ uri: item.authorAvatar }} style={styles.userAvatar} />
                                        ) : (
                                            <View style={[styles.userAvatar, styles.center]}>
                                                <Text style={styles.avatarText}>{(item.authorName || '?').charAt(0)}</Text>
                                            </View>
                                        )}
                                        <View style={styles.userDetails}>
                                            <Text style={styles.userName}>{item.authorName}</Text>
                                            <View style={styles.postMeta}>
                                                <Ionicons
                                                    name={getPostTypeIcon(item.type).name as any}
                                                    size={14}
                                                    color={getPostTypeIcon(item.type).color}
                                                    style={{ marginRight: 4 }}
                                                />
                                                <Text style={styles.postType}>{item.type}</Text>
                                                <Text style={styles.postTime}>
                                                    • {item.createdAt ? formatTimeAgo(item.createdAt.toDate()) : ''}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                </View>
                                <Text style={styles.postContent}>{item.content}</Text>

                                <View style={styles.postActions}>
                                    <TouchableOpacity
                                        style={styles.actionButton}
                                        onPress={() => handleLikePost(item.id)}
                                    >
                                        <Ionicons
                                            name={item.likes?.includes(auth.currentUser?.uid || '') ? 'heart' : 'heart-outline'}
                                            size={18}
                                            color={item.likes?.includes(auth.currentUser?.uid || '') ? '#FF5252' : '#64748B'}
                                        />
                                        <Text style={styles.actionText}>{item.likes?.length || 0}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.actionButton}
                                        onPress={() => {
                                            const newExpanded = new Set(expandedComments);
                                            if (newExpanded.has(item.id)) {
                                                newExpanded.delete(item.id);
                                            } else {
                                                newExpanded.add(item.id);
                                            }
                                            setExpandedComments(newExpanded);
                                        }}
                                    >
                                        <Ionicons name="chatbubble-outline" size={18} color="#64748B" />
                                        <Text style={styles.actionText}>{item.commentCount || 0}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.actionButton}>
                                        <Ionicons name="share-outline" size={18} color="#64748B" />
                                        <Text style={styles.actionText}>Share</Text>
                                    </TouchableOpacity>
                                </View>

                                {/* Comment Section - Expandable for entrepreneur discussions */}
                                {expandedComments.has(item.id) && (
                                    <View style={styles.commentSectionContainer}>
                                        <View style={styles.commentDivider} />
                                        <CommentSection
                                            postId={item.id}
                                            postAuthorId={item.authorId}
                                            onCommentCountChange={(count) => {
                                                setFeedItems(prev => prev.map(p =>
                                                    p.id === item.id ? { ...p, commentCount: count } : p
                                                ));
                                            }}
                                        />
                                    </View>
                                )}
                            </View>
                        ))
                    ) : (
                        <Text style={styles.emptyText}>No activity yet. Be the first to post!</Text>
                    )}
                </View>

                <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => navigation.navigate('Home')}
                >
                    <Text style={styles.secondaryButtonText}>Back to Home</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#F4F7FA'
    },
    container: {
        flex: 1,
        padding: 20
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center'
    },
    header: {
        marginBottom: 24
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        width: 120
    },
    backButtonText: {
        marginLeft: 8,
        fontSize: 16,
        color: '#333'
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1a1a1a',
        marginBottom: 8,
        letterSpacing: -0.5
    },
    subtitle: {
        fontSize: 16,
        color: '#64748B',
        lineHeight: 24
    },
    createPostCard: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1E293B',
        marginBottom: 16
    },
    postInput: {
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: '#1E293B',
        minHeight: 100,
        textAlignVertical: 'top'
    },
    postButton: {
        backgroundColor: primaryBlue,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 12
    },
    postButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600'
    },
    feedContainer: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2
    },
    feedItem: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
        marginBottom: 16
    },
    feedHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    userAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12
    },
    userDetails: {
        flex: 1
    },
    userName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1E293B',
        marginBottom: 4
    },
    postMeta: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    postType: {
        fontSize: 12,
        color: '#64748B',
        marginRight: 8,
        textTransform: 'capitalize'
    },
    postTime: {
        fontSize: 12,
        color: '#64748B'
    },
    postContent: {
        fontSize: 16,
        color: '#334155',
        lineHeight: 24,
        marginBottom: 12
    },
    postMetadata: {
        marginBottom: 12
    },
    metadataLink: {
        color: primaryBlue,
        fontSize: 14,
        fontWeight: '600'
    },
    applicationStatus: {
        backgroundColor: '#D1FAE5',
        padding: 8,
        borderRadius: 8,
        alignSelf: 'flex-start'
    },
    statusText: {
        color: '#065F46',
        fontSize: 14,
        fontWeight: '600'
    },
    paymentInfo: {
        backgroundColor: '#DBEAFE',
        padding: 8,
        borderRadius: 8,
        alignSelf: 'flex-start'
    },
    paymentText: {
        color: '#1E40AF',
        fontSize: 14,
        fontWeight: '600'
    },
    postActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 20
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4
    },
    actionText: {
        fontSize: 14,
        color: '#64748B'
    },
    emptyText: {
        textAlign: 'center',
        color: '#64748B',
        padding: 20,
        fontSize: 14
    },
    secondaryButton: {
        backgroundColor: 'white',
        padding: 18,
        borderRadius: 14,
        width: '100%',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    secondaryButtonText: {
        color: '#334155',
        fontSize: 16,
        fontWeight: '600'
    },
    loadingText: {
        marginTop: 16,
        color: '#64748B',
        fontSize: 16
    },
    avatarText: {
        fontSize: 18,
        fontWeight: '600',
        color: 'white'
    },
    commentSectionContainer: {
        marginTop: 12,
    },
    commentDivider: {
        height: 1,
        backgroundColor: '#E2E8F0',
        marginBottom: 12,
    }
});
