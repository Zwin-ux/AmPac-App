import {
    doc,
    getDoc,
    setDoc,
    addDoc,
    collection,
    serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { User } from '../types';

export const getCurrentUserDoc = async (uid: string): Promise<User | null> => {
    try {
        const userDocRef = doc(db, 'users', uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
            return userDoc.data() as User;
        }
        return null;
    } catch (error) {
        console.error("Error getting user doc:", error);
        return null;
    }
};

export const createUserDoc = async (user: User): Promise<void> => {
    try {
        const userDocRef = doc(db, 'users', user.uid);
        await setDoc(userDocRef, user);
    } catch (error) {
        console.error("Error creating user doc:", error);
        throw error;
    }
};

export const updateUserDoc = async (uid: string, data: Partial<User>): Promise<void> => {
    try {
        const userDocRef = doc(db, 'users', uid);
        await setDoc(userDocRef, data, { merge: true });
    } catch (error) {
        console.error("Error updating user doc:", error);
        throw error;
    }
};

export const createHotlineRequest = async (
    userId: string,
    topic: string,
    message: string
): Promise<void> => {
    try {
        const hotlineCollectionRef = collection(db, 'hotlineRequests');
        await addDoc(hotlineCollectionRef, {
            userId,
            topic,
            message,
            status: 'open',
            createdAt: serverTimestamp(),
        });
    } catch (error) {
        console.error("Error creating hotline request:", error);
        throw error;
    }
};
