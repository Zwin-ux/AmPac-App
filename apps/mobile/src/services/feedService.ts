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
            const user = auth.currentUser;
            if (!user) throw new Error("User not authenticated");

            const postsRef = collection(db, 'posts');

            // Fetch user profile to get badges
            const userSnap = await getDoc(doc(db, 'users', user.uid));
            const userData = userSnap.exists() ? userSnap.data() : {};
            const badges = userData.badges || [];

            const newPost: Partial<FeedPost> = {
                authorId: user.uid,
                authorName: user.displayName || 'AmPac User',
                ...(user.photoURL && { authorAvatar: user.photoURL }), // Only include if exists
                authorBadges: badges,
                orgId,
                content,
                mediaUrls,
                likes: [],
                commentCount: 0,
                type,
                engagementScore: 0,
                featured: false,
                pinned: false,
                createdAt: serverTimestamp() as any
            };

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
    }
};
