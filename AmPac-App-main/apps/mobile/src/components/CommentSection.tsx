import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, FlatList, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { commentService, Comment } from '../services/commentService';
import { notificationService } from '../services/notificationService';
import { auth } from '../../firebaseConfig';
import { formatDistanceToNow } from 'date-fns';

interface CommentSectionProps {
    postId: string;
    postAuthorId: string;
    onCommentCountChange?: (count: number) => void;
}

export default function CommentSection({ postId, postAuthorId, onCommentCountChange }: CommentSectionProps) {
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);
    const [newComment, setNewComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());

    useEffect(() => {
        const unsubscribe = commentService.subscribeToComments(postId, (fetchedComments) => {
            setComments(fetchedComments);
            setLoading(false);
            onCommentCountChange?.(fetchedComments.length);
        });

        return () => unsubscribe();
    }, [postId]);

    const handleSubmitComment = async () => {
        if (!newComment.trim()) return;

        setSubmitting(true);
        try {
            const user = auth.currentUser;
            if (!user) {
                Alert.alert('Error', 'You must be signed in to comment');
                return;
            }

            await commentService.addComment(postId, newComment.trim(), replyingTo || undefined);

            // Send notification
            if (replyingTo) {
                const parentComment = comments.find(c => c.id === replyingTo);
                if (parentComment) {
                    await notificationService.sendReplyNotification(
                        parentComment.authorId,
                        user.displayName || 'Someone',
                        postId,
                        newComment.trim()
                    );
                }
            } else {
                await notificationService.sendCommentNotification(
                    postAuthorId,
                    user.displayName || 'Someone',
                    postId,
                    newComment.trim()
                );
            }

            setNewComment('');
            setReplyingTo(null);
        } catch (error) {
            Alert.alert('Error', 'Failed to post comment');
        } finally {
            setSubmitting(false);
        }
    };

    const handleLikeComment = async (commentId: string) => {
        try {
            await commentService.toggleLike(commentId);
        } catch (error) {
            console.error('Error liking comment:', error);
        }
    };

    const handleDeleteComment = async (commentId: string) => {
        Alert.alert(
            'Delete Comment',
            'Are you sure you want to delete this comment?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await commentService.deleteComment(commentId, postId);
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete comment');
                        }
                    }
                }
            ]
        );
    };

    const toggleReplies = async (commentId: string) => {
        const newExpanded = new Set(expandedComments);
        if (newExpanded.has(commentId)) {
            newExpanded.delete(commentId);
        } else {
            newExpanded.add(commentId);
        }
        setExpandedComments(newExpanded);
    };

    const renderComment = (comment: Comment, isReply: boolean = false) => {
        const isLiked = comment.likes?.includes(auth.currentUser?.uid || '');
        const isOwnComment = comment.authorId === auth.currentUser?.uid;
        const isExpanded = expandedComments.has(comment.id);

        return (
            <View key={comment.id} style={[styles.commentContainer, isReply && styles.replyContainer]}>
                <View style={styles.commentHeader}>
                    <View style={styles.avatarSmall}>
                        <Text style={styles.avatarTextSmall}>{comment.authorName.charAt(0)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Text style={styles.commentAuthor}>{comment.authorName}</Text>
                            {comment.authorBadges?.includes('Star Member') && (
                                <Ionicons name="star" size={10} color="#FF9800" />
                            )}
                            {comment.isHelpful && (
                                <View style={styles.helpfulBadge}>
                                    <Text style={styles.helpfulText}>✓ Helpful</Text>
                                </View>
                            )}
                        </View>
                        <Text style={styles.commentTime}>
                            {comment.createdAt ? formatDistanceToNow(comment.createdAt.toDate(), { addSuffix: true }) : ''}
                            {comment.isEdited && ' (edited)'}
                        </Text>
                    </View>
                </View>

                <Text style={styles.commentContent}>{comment.content}</Text>

                <View style={styles.commentActions}>
                    <TouchableOpacity
                        style={styles.commentActionBtn}
                        onPress={() => handleLikeComment(comment.id)}
                    >
                        <Ionicons
                            name={isLiked ? 'heart' : 'heart-outline'}
                            size={14}
                            color={isLiked ? '#FF5252' : '#64748B'}
                        />
                        <Text style={styles.commentActionText}>{comment.likes?.length || 0}</Text>
                    </TouchableOpacity>

                    {!isReply && (
                        <TouchableOpacity
                            style={styles.commentActionBtn}
                            onPress={() => setReplyingTo(comment.id)}
                        >
                            <Ionicons name="chatbubble-outline" size={14} color="#64748B" />
                            <Text style={styles.commentActionText}>Reply</Text>
                        </TouchableOpacity>
                    )}

                    {comment.replyCount > 0 && !isReply && (
                        <TouchableOpacity
                            style={styles.commentActionBtn}
                            onPress={() => toggleReplies(comment.id)}
                        >
                            <Ionicons
                                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                                size={14}
                                color="#64748B"
                            />
                            <Text style={styles.commentActionText}>
                                {comment.replyCount} {comment.replyCount === 1 ? 'reply' : 'replies'}
                            </Text>
                        </TouchableOpacity>
                    )}

                    {isOwnComment && (
                        <TouchableOpacity
                            style={styles.commentActionBtn}
                            onPress={() => handleDeleteComment(comment.id)}
                        >
                            <Ionicons name="trash-outline" size={14} color="#FF5252" />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Render replies if expanded */}
                {isExpanded && comment.replyCount > 0 && (
                    <RepliesList commentId={comment.id} />
                )}
            </View>
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#0064A6" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Comment Input */}
            <View style={styles.inputContainer}>
                {replyingTo && (
                    <View style={styles.replyingBanner}>
                        <Text style={styles.replyingText}>
                            Replying to {comments.find(c => c.id === replyingTo)?.authorName}
                        </Text>
                        <TouchableOpacity onPress={() => setReplyingTo(null)}>
                            <Ionicons name="close-circle" size={18} color="#64748B" />
                        </TouchableOpacity>
                    </View>
                )}
                <View style={styles.inputRow}>
                    <TextInput
                        style={styles.input}
                        placeholder={replyingTo ? "Write a reply..." : "Write a comment..."}
                        value={newComment}
                        onChangeText={setNewComment}
                        multiline
                        maxLength={500}
                    />
                    <TouchableOpacity
                        style={[styles.sendButton, (!newComment.trim() || submitting) && styles.sendButtonDisabled]}
                        onPress={handleSubmitComment}
                        disabled={!newComment.trim() || submitting}
                    >
                        {submitting ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Ionicons name="send" size={18} color="#fff" />
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            {/* Comments List */}
            <FlatList
                data={comments}
                renderItem={({ item }) => renderComment(item)}
                keyExtractor={(item) => item.id}
                ListEmptyComponent={
                    <Text style={styles.emptyText}>No comments yet. Be the first to comment!</Text>
                }
                scrollEnabled={false}
            />
        </View>
    );
}

// Separate component for replies to avoid infinite nesting
function RepliesList({ commentId }: { commentId: string }) {
    const [replies, setReplies] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReplies = async () => {
            const fetchedReplies = await commentService.getReplies(commentId);
            setReplies(fetchedReplies);
            setLoading(false);
        };
        fetchReplies();
    }, [commentId]);

    if (loading) {
        return <ActivityIndicator size="small" color="#0064A6" style={{ marginLeft: 40 }} />;
    }

    return (
        <View style={{ marginLeft: 20, marginTop: 8 }}>
            {replies.map(reply => (
                <View key={reply.id} style={styles.replyContainer}>
                    <View style={styles.commentHeader}>
                        <View style={styles.avatarSmall}>
                            <Text style={styles.avatarTextSmall}>{reply.authorName.charAt(0)}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.commentAuthor}>{reply.authorName}</Text>
                            <Text style={styles.commentTime}>
                                {reply.createdAt ? formatDistanceToNow(reply.createdAt.toDate(), { addSuffix: true }) : ''}
                            </Text>
                        </View>
                    </View>
                    <Text style={styles.commentContent}>{reply.content}</Text>
                    <View style={styles.commentActions}>
                        <TouchableOpacity
                            style={styles.commentActionBtn}
                            onPress={() => commentService.toggleLike(reply.id)}
                        >
                            <Ionicons name="heart-outline" size={14} color="#64748B" />
                            <Text style={styles.commentActionText}>{reply.likes?.length || 0}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginTop: 16,
    },
    loadingContainer: {
        padding: 20,
        alignItems: 'center',
    },
    inputContainer: {
        marginBottom: 16,
    },
    replyingBanner: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#F1F5F9',
        padding: 8,
        borderRadius: 8,
        marginBottom: 8,
    },
    replyingText: {
        fontSize: 12,
        color: '#64748B',
        fontStyle: 'italic',
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 8,
    },
    input: {
        flex: 1,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        padding: 12,
        fontSize: 14,
        maxHeight: 100,
    },
    sendButton: {
        backgroundColor: '#0064A6',
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonDisabled: {
        opacity: 0.5,
    },
    commentContainer: {
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
    },
    replyContainer: {
        backgroundColor: '#fff',
        borderLeftWidth: 2,
        borderLeftColor: '#E2E8F0',
        marginBottom: 6,
    },
    commentHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 8,
    },
    avatarSmall: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#0064A6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarTextSmall: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    commentAuthor: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1E293B',
    },
    commentTime: {
        fontSize: 11,
        color: '#64748B',
    },
    helpfulBadge: {
        backgroundColor: '#10B981',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    helpfulText: {
        fontSize: 9,
        color: '#fff',
        fontWeight: '600',
    },
    commentContent: {
        fontSize: 14,
        color: '#334155',
        lineHeight: 20,
        marginBottom: 8,
    },
    commentActions: {
        flexDirection: 'row',
        gap: 16,
    },
    commentActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    commentActionText: {
        fontSize: 12,
        color: '#64748B',
    },
    emptyText: {
        textAlign: 'center',
        color: '#94A3B8',
        fontSize: 14,
        padding: 20,
        fontStyle: 'italic',
    },
});
