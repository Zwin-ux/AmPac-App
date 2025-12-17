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
    startAfter,
    getDocs,
    getDoc
} from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import { FeedPost } from '../types';

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
            const newPost: Partial<FeedPost> = {
                authorId: user.uid,
                authorName: user.displayName || 'AmPac User',
                authorAvatar: user.photoURL || undefined,
                orgId,
                content,
                mediaUrls,
                likes: [],
                commentCount: 0,
                type,
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
            if (!user) return; // Silent fail if not logged in

            const postRef = doc(db, 'posts', postId);
            // We don't read first to save a readOp, we can just try to use arrayUnion/Remove if we knew state.
            // But to toggle, we need to know if we liked it.
            // For UI responsiveness, UI usually passes current state. 
            // Here we'll just check specific document cache or read it.
            // Optimization: The UI calling this likely has the 'post' object.
            // But services should be robust.
            
            // Let's implement a safe toggle using getDoc for now.
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

    // Kept for backward compatibility if needed, but updated signatures
    getFeed: async (): Promise<FeedPost[]> => {
        // One-off fetch
        const postsRef = collection(db, 'posts');
        const q = query(postsRef, orderBy('createdAt', 'desc'), limit(20));
        const snap = await getDocs(q);
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as FeedPost));
    }
};
