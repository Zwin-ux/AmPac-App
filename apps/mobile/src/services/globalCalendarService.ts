/**
 * Global Calendar Service
 * Manages AMPAC-wide events that users can subscribe to
 * - Business events from the network
 * - AMPAC community events  
 * - Partner/sponsor events
 */

import { db, auth } from '../../firebaseConfig';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    addDoc,
    query,
    where,
    orderBy,
    Timestamp,
    onSnapshot,
    limit,
    arrayUnion,
    arrayRemove,
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const GLOBAL_EVENTS_CACHE_KEY = 'ampac_global_events_cache';
const SUBSCRIPTIONS_CACHE_KEY = 'ampac_event_subscriptions';

export type EventCategory = 
    | 'ampac-official'      // AMPAC corporate events
    | 'community'           // Community member events
    | 'business-network'    // Business network events
    | 'partner'             // Partner/sponsor events
    | 'workshop'            // Educational workshops
    | 'networking'          // Networking events
    | 'webinar';            // Online webinars

export interface GlobalEvent {
    id: string;
    title: string;
    description: string;
    category: EventCategory;
    startDate: Timestamp;
    endDate?: Timestamp;
    location?: string;
    virtualLink?: string;
    isVirtual: boolean;
    organizerId: string;
    organizerName: string;
    organizerType: 'ampac' | 'business' | 'user';
    businessId?: string;
    businessName?: string;
    imageUrl?: string;
    maxAttendees?: number;
    attendees: string[];
    tags: string[];
    isPublic: boolean;
    isFeatured: boolean;
    isPinned: boolean;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface EventSubscription {
    userId: string;
    categories: EventCategory[];
    businesses: string[];  // Business IDs to follow
    keywords: string[];    // Tag keywords
    notifyNewEvents: boolean;
    notifyReminders: boolean;
    reminderMinutes: number;  // Minutes before event
}

class GlobalCalendarService {
    private unsubscribeListener: (() => void) | null = null;
    private listeners: Set<(events: GlobalEvent[]) => void> = new Set();
    private cachedEvents: GlobalEvent[] = [];

    /**
     * Initialize the service and load cached events
     */
    async initialize(): Promise<void> {
        try {
            const cached = await AsyncStorage.getItem(GLOBAL_EVENTS_CACHE_KEY);
            if (cached) {
                this.cachedEvents = JSON.parse(cached);
            }
        } catch (error) {
            console.warn('Failed to load cached global events:', error);
        }
    }

    /**
     * Subscribe to global events updates
     */
    subscribeToGlobalEvents(
        callback: (events: GlobalEvent[]) => void,
        options?: {
            categories?: EventCategory[];
            startAfter?: Date;
            includePrivate?: boolean;
        }
    ): () => void {
        this.listeners.add(callback);

        // Return cached events immediately
        if (this.cachedEvents.length > 0) {
            const filtered = this.filterEvents(this.cachedEvents, options);
            callback(filtered);
        }

        // Set up real-time listener if not already active
        if (!this.unsubscribeListener) {
            this.setupRealtimeListener();
        }

        return () => {
            this.listeners.delete(callback);
            if (this.listeners.size === 0 && this.unsubscribeListener) {
                this.unsubscribeListener();
                this.unsubscribeListener = null;
            }
        };
    }

    private setupRealtimeListener(): void {
        const now = Timestamp.now();
        const eventsRef = collection(db, 'globalEvents');
        const q = query(
            eventsRef,
            where('startDate', '>=', now),
            where('isPublic', '==', true),
            orderBy('startDate', 'asc'),
            limit(100)
        );

        this.unsubscribeListener = onSnapshot(q, (snapshot) => {
            this.cachedEvents = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as GlobalEvent));

            // Cache events
            AsyncStorage.setItem(GLOBAL_EVENTS_CACHE_KEY, JSON.stringify(this.cachedEvents));

            // Notify all listeners
            this.listeners.forEach(listener => listener(this.cachedEvents));
        }, (error) => {
            console.error('Global events listener error:', error);
        });
    }

    private filterEvents(
        events: GlobalEvent[],
        options?: {
            categories?: EventCategory[];
            startAfter?: Date;
            includePrivate?: boolean;
        }
    ): GlobalEvent[] {
        let filtered = events;

        if (options?.categories && options.categories.length > 0) {
            filtered = filtered.filter(e => options.categories!.includes(e.category));
        }

        if (options?.startAfter) {
            const startTimestamp = Timestamp.fromDate(options.startAfter);
            filtered = filtered.filter(e => e.startDate >= startTimestamp);
        }

        if (!options?.includePrivate) {
            filtered = filtered.filter(e => e.isPublic);
        }

        return filtered;
    }

    /**
     * Get upcoming events (one-time fetch)
     */
    async getUpcomingEvents(
        options?: {
            categories?: EventCategory[];
            limitCount?: number;
            businessIds?: string[];
        }
    ): Promise<GlobalEvent[]> {
        try {
            const now = Timestamp.now();
            const eventsRef = collection(db, 'globalEvents');
            
            let q = query(
                eventsRef,
                where('startDate', '>=', now),
                where('isPublic', '==', true),
                orderBy('startDate', 'asc'),
                limit(options?.limitCount || 50)
            );

            const snapshot = await getDocs(q);
            let events = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as GlobalEvent));

            // Filter by categories if specified
            if (options?.categories && options.categories.length > 0) {
                events = events.filter(e => options.categories!.includes(e.category));
            }

            // Filter by business IDs if specified
            if (options?.businessIds && options.businessIds.length > 0) {
                events = events.filter(e => 
                    !e.businessId || options.businessIds!.includes(e.businessId)
                );
            }

            return events;
        } catch (error) {
            console.error('Failed to fetch upcoming events:', error);
            return this.cachedEvents;
        }
    }

    /**
     * Get featured events for homepage display
     */
    async getFeaturedEvents(maxCount: number = 5): Promise<GlobalEvent[]> {
        try {
            const now = Timestamp.now();
            const eventsRef = collection(db, 'globalEvents');
            const q = query(
                eventsRef,
                where('isFeatured', '==', true),
                where('startDate', '>=', now),
                where('isPublic', '==', true),
                orderBy('startDate', 'asc'),
                limit(maxCount)
            );

            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as GlobalEvent));
        } catch (error) {
            console.error('Failed to fetch featured events:', error);
            return [];
        }
    }

    /**
     * Create a new global event
     */
    async createEvent(event: Omit<GlobalEvent, 'id' | 'createdAt' | 'updatedAt' | 'attendees'>): Promise<string> {
        const userId = auth.currentUser?.uid;
        if (!userId) throw new Error('Must be logged in to create events');

        const now = Timestamp.now();
        const eventData = {
            ...event,
            attendees: [userId],  // Creator automatically attends
            createdAt: now,
            updatedAt: now,
        };

        const docRef = await addDoc(collection(db, 'globalEvents'), eventData);
        return docRef.id;
    }

    /**
     * Update an existing event
     */
    async updateEvent(eventId: string, updates: Partial<GlobalEvent>): Promise<void> {
        const userId = auth.currentUser?.uid;
        if (!userId) throw new Error('Must be logged in');

        // Verify ownership
        const eventRef = doc(db, 'globalEvents', eventId);
        const eventSnap = await getDoc(eventRef);
        
        if (!eventSnap.exists()) {
            throw new Error('Event not found');
        }

        const eventData = eventSnap.data() as GlobalEvent;
        if (eventData.organizerId !== userId) {
            throw new Error('Not authorized to update this event');
        }

        await updateDoc(eventRef, {
            ...updates,
            updatedAt: Timestamp.now(),
        });
    }

    /**
     * Delete an event
     */
    async deleteEvent(eventId: string): Promise<void> {
        const userId = auth.currentUser?.uid;
        if (!userId) throw new Error('Must be logged in');

        const eventRef = doc(db, 'globalEvents', eventId);
        const eventSnap = await getDoc(eventRef);
        
        if (!eventSnap.exists()) return;

        const eventData = eventSnap.data() as GlobalEvent;
        if (eventData.organizerId !== userId) {
            throw new Error('Not authorized to delete this event');
        }

        await deleteDoc(eventRef);
    }

    /**
     * RSVP to an event
     */
    async rsvpToEvent(eventId: string): Promise<void> {
        const userId = auth.currentUser?.uid;
        if (!userId) throw new Error('Must be logged in to RSVP');

        const eventRef = doc(db, 'globalEvents', eventId);
        await updateDoc(eventRef, {
            attendees: arrayUnion(userId),
            updatedAt: Timestamp.now(),
        });

        // Also add to user's personal calendar
        const { personalCalendarService } = await import('./personalCalendarService');
        const eventSnap = await getDoc(eventRef);
        if (eventSnap.exists()) {
            const eventData = eventSnap.data() as GlobalEvent;
            await personalCalendarService.createEvent({
                title: eventData.title,
                description: eventData.description,
                startDate: eventData.startDate,
                endDate: eventData.endDate || eventData.startDate,
                type: 'community',
                color: '#6366F1',
                allDay: false,
                reminders: [60], // 60 minutes before
                recurrence: 'none',
                location: eventData.location,
            });
        }
    }

    /**
     * Cancel RSVP
     */
    async cancelRsvp(eventId: string): Promise<void> {
        const userId = auth.currentUser?.uid;
        if (!userId) throw new Error('Must be logged in');

        const eventRef = doc(db, 'globalEvents', eventId);
        await updateDoc(eventRef, {
            attendees: arrayRemove(userId),
            updatedAt: Timestamp.now(),
        });
    }

    /**
     * Get user's event subscriptions preferences
     */
    async getSubscriptions(): Promise<EventSubscription | null> {
        const userId = auth.currentUser?.uid;
        if (!userId) return null;

        try {
            const subRef = doc(db, 'eventSubscriptions', userId);
            const subSnap = await getDoc(subRef);
            
            if (subSnap.exists()) {
                return subSnap.data() as EventSubscription;
            }
            return null;
        } catch (error) {
            console.error('Failed to get subscriptions:', error);
            return null;
        }
    }

    /**
     * Update user's event subscriptions
     */
    async updateSubscriptions(subscriptions: Partial<EventSubscription>): Promise<void> {
        const userId = auth.currentUser?.uid;
        if (!userId) throw new Error('Must be logged in');

        const subRef = doc(db, 'eventSubscriptions', userId);
        const subSnap = await getDoc(subRef);

        if (subSnap.exists()) {
            await updateDoc(subRef, subscriptions);
        } else {
            const defaultSub: EventSubscription = {
                userId,
                categories: ['ampac-official', 'community', 'workshop'],
                businesses: [],
                keywords: [],
                notifyNewEvents: true,
                notifyReminders: true,
                reminderMinutes: 60,
                ...subscriptions,
            };
            await setDoc(subRef, defaultSub);
        }
    }

    /**
     * Subscribe to a business's events
     */
    async subscribeToBusinessEvents(businessId: string): Promise<void> {
        const userId = auth.currentUser?.uid;
        if (!userId) throw new Error('Must be logged in');

        const subRef = doc(db, 'eventSubscriptions', userId);
        await updateDoc(subRef, {
            businesses: arrayUnion(businessId),
        });
    }

    /**
     * Unsubscribe from a business's events
     */
    async unsubscribeFromBusinessEvents(businessId: string): Promise<void> {
        const userId = auth.currentUser?.uid;
        if (!userId) throw new Error('Must be logged in');

        const subRef = doc(db, 'eventSubscriptions', userId);
        await updateDoc(subRef, {
            businesses: arrayRemove(businessId),
        });
    }

    /**
     * Get events for a specific business
     */
    async getBusinessEvents(businessId: string): Promise<GlobalEvent[]> {
        try {
            const now = Timestamp.now();
            const eventsRef = collection(db, 'globalEvents');
            const q = query(
                eventsRef,
                where('businessId', '==', businessId),
                where('startDate', '>=', now),
                orderBy('startDate', 'asc'),
                limit(20)
            );

            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as GlobalEvent));
        } catch (error) {
            console.error('Failed to fetch business events:', error);
            return [];
        }
    }

    /**
     * Get personalized events based on user's subscriptions
     */
    async getPersonalizedEvents(): Promise<GlobalEvent[]> {
        const subscriptions = await this.getSubscriptions();
        if (!subscriptions) {
            // Return default popular events
            return this.getUpcomingEvents({ limitCount: 20 });
        }

        const events = await this.getUpcomingEvents({
            categories: subscriptions.categories,
            businessIds: subscriptions.businesses,
            limitCount: 50,
        });

        // Also filter by keywords if any
        if (subscriptions.keywords.length > 0) {
            return events.filter(event => 
                subscriptions.keywords.some(keyword =>
                    event.title.toLowerCase().includes(keyword.toLowerCase()) ||
                    event.description.toLowerCase().includes(keyword.toLowerCase()) ||
                    event.tags.some(tag => tag.toLowerCase().includes(keyword.toLowerCase()))
                )
            );
        }

        return events;
    }
}

export const globalCalendarService = new GlobalCalendarService();
