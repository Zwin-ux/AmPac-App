import {
    collection,
    addDoc,
    serverTimestamp,
    query,
    where,
    onSnapshot,
    orderBy,
    doc,
    updateDoc,
    deleteDoc,
    arrayUnion,
    arrayRemove,
    getDocs,
    getDoc,
    Timestamp,
    increment
} from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import { getCurrentUserId, getCurrentDisplayName } from './authUtils';

export interface Comment {
    id: string;
    postId: string;
    authorId: string;
    authorName: string;
    authorAvatar?: string;
    authorBadges?: string[];

    content: string;
    likes: string[];

    parentCommentId?: string;  // For nested replies
    replyCount: number;

    isHelpful: boolean;  // Marked by post author
    isEdited: boolean;

    createdAt: Timestamp;
    updatedAt?: Timestamp;
}

export const commentService = {
    /**
     * Add a comment to a post
     */
    addComment: async (postId: string, content: string, parentCommentId?: string): Promise<string> => {
        try {
            const uid = getCurrentUserId();
            if (!uid) throw new Error("User not authenticated");
            const displayName = getCurrentDisplayName();

            // Fetch user profile to get badges
            let badges: string[] = [];
            const user = auth.currentUser;
            if (user) {
                const userSnap = await getDoc(doc(db, 'users', user.uid));
                const userData = userSnap.exists() ? userSnap.data() : {};
                badges = userData.badges || [];
            } else if (uid === 'dev-user') {
                badges = ['Developer'];
            }

            const newComment: any = {
                postId,
                authorId: uid,
                authorName: displayName,
                authorBadges: badges,
                content,
                likes: [],
                replyCount: 0,
                isHelpful: false,
                isEdited: false,
                createdAt: serverTimestamp()
            };

            if (user?.photoURL) {
                newComment.authorAvatar = user.photoURL;
            }

            if (parentCommentId) {
                newComment.parentCommentId = parentCommentId;
            }

            const docRef = await addDoc(collection(db, 'comments'), newComment);

            // Update post comment count
            const postRef = doc(db, 'posts', postId);
            await updateDoc(postRef, {
                commentCount: increment(1)
            });

            // If this is a reply, update parent comment reply count
            if (parentCommentId) {
                const parentRef = doc(db, 'comments', parentCommentId);
                await updateDoc(parentRef, {
                    replyCount: increment(1)
                });
            }

            return docRef.id;
        } catch (error) {
            console.error("Error adding comment:", error);
            throw error;
        }
    },

    /**
     * Get comments for a post
     */
    getComments: async (postId: string): Promise<Comment[]> => {
        try {
            const q = query(
                collection(db, 'comments'),
                where('postId', '==', postId),
                where('parentCommentId', '==', null),  // Only top-level comments
                orderBy('createdAt', 'desc')
            );

            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Comment));
        } catch (error) {
            console.error("Error getting comments:", error);
            return [];
        }
    },

    /**
     * Get replies to a comment
     */
    getReplies: async (commentId: string): Promise<Comment[]> => {
        try {
            const q = query(
                collection(db, 'comments'),
                where('parentCommentId', '==', commentId),
                orderBy('createdAt', 'asc')
            );

            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Comment));
        } catch (error) {
            console.error("Error getting replies:", error);
            return [];
        }
    },

    /**
     * Subscribe to comments for a post (real-time)
     */
    subscribeToComments: (postId: string, onUpdate: (comments: Comment[]) => void) => {
        const q = query(
            collection(db, 'comments'),
            where('postId', '==', postId),
            where('parentCommentId', '==', null),
            orderBy('createdAt', 'desc')
        );

        return onSnapshot(q, (snapshot) => {
            const comments = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Comment));
            onUpdate(comments);
        }, (error) => {
            console.error("Error subscribing to comments:", error);
            onUpdate([]);
        });
    },

    /**
     * Toggle like on a comment
     */
    toggleLike: async (commentId: string) => {
        try {
            const user = auth.currentUser;
            if (!user) return;

            const commentRef = doc(db, 'comments', commentId);
            const snap = await getDoc(commentRef);
            if (!snap.exists()) return;

            const comment = snap.data() as Comment;
            const hasLiked = comment.likes && comment.likes.includes(user.uid);

            if (hasLiked) {
                await updateDoc(commentRef, {
                    likes: arrayRemove(user.uid)
                });
            } else {
                await updateDoc(commentRef, {
                    likes: arrayUnion(user.uid)
                });
            }
        } catch (error) {
            console.error("Error toggling comment like:", error);
            throw error;
        }
    },

    /**
     * Mark comment as helpful (post author only)
     */
    markAsHelpful: async (commentId: string, postAuthorId: string) => {
        try {
            const user = auth.currentUser;
            if (!user || user.uid !== postAuthorId) {
                throw new Error("Only post author can mark comments as helpful");
            }

            const commentRef = doc(db, 'comments', commentId);
            await updateDoc(commentRef, {
                isHelpful: true
            });
        } catch (error) {
            console.error("Error marking comment as helpful:", error);
            throw error;
        }
    },

    /**
     * Edit a comment
     */
    editComment: async (commentId: string, newContent: string) => {
        try {
            const user = auth.currentUser;
            if (!user) throw new Error("User not authenticated");

            const commentRef = doc(db, 'comments', commentId);
            const snap = await getDoc(commentRef);

            if (!snap.exists()) throw new Error("Comment not found");

            const comment = snap.data() as Comment;
            if (comment.authorId !== user.uid) {
                throw new Error("You can only edit your own comments");
            }

            await updateDoc(commentRef, {
                content: newContent,
                isEdited: true,
                updatedAt: serverTimestamp()
            });
        } catch (error) {
            console.error("Error editing comment:", error);
            throw error;
        }
    },

    /**
     * Delete a comment
     */
    deleteComment: async (commentId: string, postId: string) => {
        try {
            const user = auth.currentUser;
            if (!user) throw new Error("User not authenticated");

            const commentRef = doc(db, 'comments', commentId);
            const snap = await getDoc(commentRef);

            if (!snap.exists()) throw new Error("Comment not found");

            const comment = snap.data() as Comment;
            if (comment.authorId !== user.uid) {
                throw new Error("You can only delete your own comments");
            }

            // Delete all replies first
            const repliesQuery = query(
                collection(db, 'comments'),
                where('parentCommentId', '==', commentId)
            );
            const repliesSnapshot = await getDocs(repliesQuery);
            const deletePromises = repliesSnapshot.docs.map(doc => deleteDoc(doc.ref));
            await Promise.all(deletePromises);

            // Delete the comment
            await deleteDoc(commentRef);

            // Update post comment count
            const postRef = doc(db, 'posts', postId);
            await updateDoc(postRef, {
                commentCount: increment(-(1 + repliesSnapshot.size))  // Comment + all replies
            });

            // If this was a reply, update parent comment reply count
            if (comment.parentCommentId) {
                const parentRef = doc(db, 'comments', comment.parentCommentId);
                await updateDoc(parentRef, {
                    replyCount: increment(-1)
                });
            }
        } catch (error) {
            console.error("Error deleting comment:", error);
            throw error;
        }
    }
};
