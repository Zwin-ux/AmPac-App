import {
    collection,
    query,
    orderBy,
    limit,
    onSnapshot,
    addDoc,
    serverTimestamp,
    updateDoc,
    doc,
    arrayUnion,
    arrayRemove,
    getDocs,
    getDoc,
    where,
    Timestamp
} from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import { getCurrentUserId, getCurrentDisplayName } from './authUtils';
import { FeedPost, Event } from '../types';
import { getEvents } from './events';

export const feedService = {
    /**
     * Subscribe to the global/community feed.
     */
    subscribeToFeed: (limitCount: number = 20, onUpdate: (posts: FeedPost[]) => void) => {
        const postsRef = collection(db, 'posts');
        const q = query(postsRef, orderBy('createdAt', 'desc'), limit(limitCount));

        return onSnapshot(q, (snapshot) => {
            const posts = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as FeedPost));
            onUpdate(posts);
        }, (error) => {
            console.error("Error subscribing to feed:", error);
            onUpdate([]);
        });
    },

    createPost: async (content: string, type: FeedPost['type'] = 'announcement', mediaUrls: string[] = [], orgId?: string): Promise<string> => {
        try {
            const uid = getCurrentUserId();
            if (!uid) throw new Error("User not authenticated");
            const displayName = getCurrentDisplayName();

            const postsRef = collection(db, 'posts');

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

            // Extract hashtags from content
            const hashtags = feedService.extractHashtags(content);

            const newPost: any = {
                authorId: uid,
                authorName: displayName,
                authorBadges: badges,
                orgId,
                content,
                mediaUrls,
                hashtags,
                likes: [],
                commentCount: 0,
                type,
                createdAt: serverTimestamp()
            };

            if (user?.photoURL) {
                newPost.authorAvatar = user.photoURL;
            }

            const docRef = await addDoc(postsRef, newPost);
            return docRef.id;
        } catch (error) {
            console.error("Error creating post:", error);
            throw error;
        }
    },

    toggleLike: async (postId: string) => {
        try {
            const user = auth.currentUser;
            if (!user) return;

            const postRef = doc(db, 'posts', postId);
            const snap = await getDoc(postRef);
            if (!snap.exists()) return;

            const post = snap.data() as FeedPost;
            const hasLiked = post.likes && post.likes.includes(user.uid);

            if (hasLiked) {
                await updateDoc(postRef, {
                    likes: arrayRemove(user.uid)
                });
            } else {
                await updateDoc(postRef, {
                    likes: arrayUnion(user.uid)
                });
            }
        } catch (error) {
            console.error("Error toggling like:", error);
            throw error;
        }
    },

    // ...existing code...

    getFeed: async (): Promise<FeedPost[]> => {
        const postsRef = collection(db, 'posts');
        const q = query(postsRef, orderBy('createdAt', 'desc'), limit(20));
        const snap = await getDocs(q);
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as FeedPost));
    },

    computeEngagementScore: (item: FeedPost | Event): number => {
        const likes = (item as FeedPost).likes?.length || 0;
        const comments = (item as FeedPost).commentCount || 0;
        const featuredBoost = (item as FeedPost).featured ? 100 : 0;
        const pinnedBoost = (item as FeedPost).pinned ? 500 : 0;

        // Time decay: Score = (L + C*2 + 1) / (Hours + 2)^1.5
        const createdAt = item.createdAt instanceof Timestamp ? item.createdAt.toDate() : new Date();
        const hoursOld = (Date.now() - createdAt.getTime()) / 3600000;

        const baseScore = (likes + comments * 2 + 1) / Math.pow(hoursOld + 2, 1.5);
        return baseScore + featuredBoost + pinnedBoost;
    },

    getAlgorithmicFeed: async (): Promise<(FeedPost | Event)[]> => {
        try {
            // Fetch posts and events in parallel
            const [postsSnapshot, events] = await Promise.all([
                getDocs(query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(50))),
                getEvents()
            ]);

            const posts = postsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as FeedPost));

            const combined: (FeedPost | Event)[] = [...posts, ...events];

            return combined.sort((a, b) => {
                const scoreA = feedService.computeEngagementScore(a);
                const scoreB = feedService.computeEngagementScore(b);
                return scoreB - scoreA;
            });
        } catch (error) {
            console.error("Error fetching algorithmic feed:", error);
            return [];
        }
    },

    /**
     * Extract hashtags from content.
     */
    extractHashtags: (content: string): string[] => {
        const hashtagRegex = /#(\w+)/g;
        const matches = content.match(hashtagRegex);
        return matches ? matches.map(tag => tag.toLowerCase()) : [];
    },

    /**
     * Get posts by hashtag.
     */
    getPostsByHashtag: async (hashtag: string): Promise<FeedPost[]> => {
        const tag = hashtag.toLowerCase().replace('#', '');
        const postsRef = collection(db, 'posts');
        const q = query(postsRef, where('hashtags', 'array-contains', tag), orderBy('createdAt', 'desc'), limit(50));
        const snap = await getDocs(q);
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as FeedPost));
    },

    /**
     * Get trending hashtags.
     */
    getTrendingHashtags: async (): Promise<{ tag: string; count: number }[]> => {
        const postsRef = collection(db, 'posts');
        // Get posts from the last 7 days
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const q = query(postsRef, where('createdAt', '>=', Timestamp.fromDate(weekAgo)));
        const snap = await getDocs(q);

        const tagCounts: Record<string, number> = {};
        snap.docs.forEach(doc => {
            const post = doc.data() as FeedPost;
            (post.hashtags || []).forEach((tag: string) => {
                tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            });
        });

        return Object.entries(tagCounts)
            .map(([tag, count]) => ({ tag, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
    },

    /**
     * Get posts by a specific user.
     */
    getUserPosts: async (userId: string): Promise<FeedPost[]> => {
        const postsRef = collection(db, 'posts');
        const q = query(postsRef, where('authorId', '==', userId), orderBy('createdAt', 'desc'), limit(50));
        const snap = await getDocs(q);
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as FeedPost));
    },

    /**
     * Delete a post (author only).
     */
    deletePost: async (postId: string): Promise<void> => {
        const user = auth.currentUser;
        if (!user) throw new Error("User not authenticated");

        const postRef = doc(db, 'posts', postId);
        const snap = await getDoc(postRef);
        if (!snap.exists()) throw new Error("Post not found");

        const post = snap.data() as FeedPost;
        if (post.authorId !== user.uid) throw new Error("Not authorized");

        const { deleteDoc: deleteDocFn } = await import('firebase/firestore');
        await deleteDocFn(postRef);
    },

    /**
     * Pin a post (admin only).
     */
    pinPost: async (postId: string, pinned: boolean): Promise<void> => {
        const postRef = doc(db, 'posts', postId);
        await updateDoc(postRef, { pinned });
    },

    /**
     * Feature a post (admin only).
     */
    featurePost: async (postId: string, featured: boolean): Promise<void> => {
        const postRef = doc(db, 'posts', postId);
        await updateDoc(postRef, { featured });
    }
};
