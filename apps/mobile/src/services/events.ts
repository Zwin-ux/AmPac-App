import {
    collection,
    query,
    orderBy,
    getDocs,
    addDoc,
    serverTimestamp,
    doc,
    updateDoc,
    arrayUnion,
    arrayRemove,
    Timestamp,
    where
} from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import { Event } from '../types';
import { notificationService } from './notificationService';
import { getDoc } from 'firebase/firestore';

export const getEvents = async (): Promise<Event[]> => {
    try {
        const eventsRef = collection(db, 'events');
        const q = query(eventsRef, orderBy('date', 'asc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Event));
    } catch (error) {
        console.error("Error fetching events:", error);
        return [];
    }
};

export const createEvent = async (event: Omit<Event, 'id' | 'attendees' | 'engagementScore' | 'organizerId' | 'organizerName'>): Promise<string> => {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error("Authentication required");

        const eventsRef = collection(db, 'events');
        // Fetch user profile for badges
        const userSnap = await getDoc(doc(db, 'users', user.uid));
        const userData = userSnap.exists() ? userSnap.data() as any : {};
        const badges = userData.badges || [];

        const newEvent = {
            ...event,
            organizerId: user.uid,
            organizerName: user.displayName || 'AmPac User',
            organizerAvatar: user.photoURL || undefined,
            organizerBadges: badges,
            attendees: [],
            engagementScore: 0,
            createdAt: serverTimestamp()
        };

        const docRef = await addDoc(eventsRef, newEvent);
        return docRef.id;
    } catch (error) {
        console.error("Error creating event:", error);
        throw error;
    }
};

export const toggleRSVP = async (eventId: string, isJoining: boolean) => {
    try {
        const user = auth.currentUser;
        if (!user) return;

        const eventRef = doc(db, 'events', eventId);
        await updateDoc(eventRef, {
            attendees: isJoining ? arrayUnion(user.uid) : arrayRemove(user.uid),
            engagementScore: isJoining ? serverTimestamp() : serverTimestamp()
        });

        // Send Notification if joining
        if (isJoining) {
            const eventSnap = await getDoc(eventRef);
            if (eventSnap.exists()) {
                const eventData = eventSnap.data() as Event;
                // Don't notify if self-RSVP
                if (eventData.organizerId !== user.uid) {
                    await notificationService.sendRSVPNotification(
                        eventData.organizerId,
                        eventData.title,
                        eventId,
                        user.displayName || 'A user'
                    );
                }
            }
        }
    } catch (error) {
        console.error("Error toggling RSVP:", error);
    }
};
