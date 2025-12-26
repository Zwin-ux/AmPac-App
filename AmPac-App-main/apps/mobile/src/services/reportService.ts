import { 
    collection, 
    addDoc, 
    serverTimestamp,
    doc,
    updateDoc,
    arrayUnion,
    getDoc,
    setDoc
} from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import { getCurrentUserId } from './authUtils';

export interface Report {
    id?: string;
    reporterId: string;
    targetId: string; // Message ID, Post ID, or User ID
    targetType: 'message' | 'post' | 'user';
    reason: string;
    createdAt: any;
    status: 'pending' | 'reviewed';
}

export const reportService = {
    /**
     * Report content (message, post) or a user.
     */
    reportContent: async (
        targetId: string, 
        targetType: 'message' | 'post' | 'user', 
        reason: string
    ) => {
        const uid = getCurrentUserId();
        if (!uid) throw new Error("User not authenticated");

        try {
            await addDoc(collection(db, 'reports'), {
                reporterId: uid,
                targetId,
                targetType,
                reason,
                createdAt: serverTimestamp(),
                status: 'pending'
            });
            console.log("Report submitted successfully");
        } catch (error) {
            console.error("Error submitting report:", error);
            throw error;
        }
    },

    /**
     * Block a user.
     * Stores blocked user IDs in a subcollection `users/{uid}/blockedUsers`.
     */
    blockUser: async (blockedUserId: string) => {
        const user = auth.currentUser;
        if (!user) throw new Error("Must be logged in to block.");

        try {
            const blockedRef = doc(db, 'users', user.uid, 'blocked', blockedUserId);
            await setDoc(blockedRef, {
                blockedUserId,
                blockedAt: serverTimestamp()
            });
            console.log("User blocked successfully");
        } catch (error) {
            console.error("Error blocking user:", error);
            throw error;
        }
    },

    /**
     * Check if a user is blocked by the current user.
     * (Optimized: In a real app, you'd sync this list on startup to a local store)
     */
    isUserBlocked: async (targetUserId: string): Promise<boolean> => {
        const user = auth.currentUser;
        if (!user) return false;

        const docRef = doc(db, 'users', user.uid, 'blocked', targetUserId);
        const snapshot = await getDoc(docRef);
        return snapshot.exists();
    }
};
