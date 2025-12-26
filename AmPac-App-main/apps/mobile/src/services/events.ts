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
import { getCurrentUserId, getCurrentDisplayName } from './authUtils';
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
        const uid = getCurrentUserId();
        if (!uid) throw new Error("User not authenticated");
        const displayName = getCurrentDisplayName();

        const eventsRef = collection(db, 'events');
        // Fetch user profile for badges
        let badges: string[] = [];
        const user = auth.currentUser;
        if (user) {
            const userSnap = await getDoc(doc(db, 'users', user.uid));
            const userData = userSnap.exists() ? userSnap.data() as any : {};
            badges = userData.badges || [];
        } else if (uid === 'dev-user') {
            badges = ['Developer'];
        }

        const newEvent: any = {
            ...event,
            organizerId: uid,
            organizerName: displayName,
            organizerBadges: badges,
            attendees: [],
            createdAt: serverTimestamp()
        };

        if (user?.photoURL) {
            newEvent.organizerAvatar = user.photoURL;
        }

        const docRef = await addDoc(eventsRef, newEvent);
        return docRef.id;
    } catch (error) {
        console.error("Error creating event:", error);
        throw error;
    }
};

export const toggleRSVP = async (eventId: string, isJoining: boolean) => {
    try {
        const uid = getCurrentUserId();
        if (!uid) throw new Error("User not authenticated");
        const displayName = getCurrentDisplayName();

        const eventRef = doc(db, 'events', eventId);
        await updateDoc(eventRef, {
            attendees: isJoining ? arrayUnion(uid) : arrayRemove(uid),
            engagementScore: isJoining ? serverTimestamp() : serverTimestamp()
        });

        // Send Notification if joining
        if (isJoining) {
            const eventSnap = await getDoc(eventRef);
            if (eventSnap.exists()) {
                const eventData = eventSnap.data() as Event;
                // Don't notify if self-RSVP
                if (eventData.organizerId !== uid) {
                    await notificationService.sendRSVPNotification(
                        eventData.organizerId,
                        eventData.title,
                        eventId,
                        displayName
                    );
                }
            }
        }
    } catch (error) {
        console.error("Error toggling RSVP:", error);
    }
};
