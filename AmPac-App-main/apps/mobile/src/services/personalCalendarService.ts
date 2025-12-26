/**
 * Personal Calendar Service
 * 
 * Handles user's personal calendar events, recurring events,
 * community event syncing, and loan milestone integration.
 */

import {
    collection,
    doc,
    addDoc,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    serverTimestamp,
    Timestamp,
    writeBatch
} from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import { getCurrentUserId } from './authUtils';
import { CalendarEvent, CalendarReminder, RecurrencePattern, CalendarEventType, Event as CommunityEvent } from '../types';

// Color palette for calendar events
export const EVENT_COLORS = {
    personal: '#4F46E5',    // Indigo
    community: '#059669',   // Green
    loan_milestone: '#DC2626', // Red
    meeting: '#2563EB',     // Blue
    task: '#D97706',        // Amber
};

export const personalCalendarService = {
    /**
     * Create a new calendar event.
     */
    createEvent: async (event: Omit<CalendarEvent, 'id' | 'userId' | 'createdAt'>): Promise<string> => {
        const uid = getCurrentUserId();
        if (!uid) throw new Error("User not authenticated");

        const eventsRef = collection(db, 'calendar_events');
        const newEvent = {
            ...event,
            userId: uid,
            color: event.color || EVENT_COLORS[event.type] || EVENT_COLORS.personal,
            createdAt: serverTimestamp()
        };

        const docRef = await addDoc(eventsRef, newEvent);

        // Create reminders if specified
        if (event.reminders && event.reminders.length > 0) {
            await personalCalendarService.createReminders(docRef.id, event.startDate, event.reminders);
        }

        return docRef.id;
    },

    /**
     * Update an existing calendar event.
     */
    updateEvent: async (eventId: string, updates: Partial<CalendarEvent>): Promise<void> => {
        const uid = getCurrentUserId();
        if (!uid) throw new Error("User not authenticated");

        const eventRef = doc(db, 'calendar_events', eventId);
        const snap = await getDoc(eventRef);
        
        if (!snap.exists()) throw new Error("Event not found");
        if (snap.data().userId !== uid) throw new Error("Not authorized");

        await updateDoc(eventRef, {
            ...updates,
            updatedAt: serverTimestamp()
        });

        // Update reminders if changed
        if (updates.reminders !== undefined && updates.startDate) {
            await personalCalendarService.deleteReminders(eventId);
            if (updates.reminders.length > 0) {
                await personalCalendarService.createReminders(eventId, updates.startDate, updates.reminders);
            }
        }
    },

    /**
     * Delete a calendar event and its reminders.
     */
    deleteEvent: async (eventId: string): Promise<void> => {
        const uid = getCurrentUserId();
        if (!uid) throw new Error("User not authenticated");

        const eventRef = doc(db, 'calendar_events', eventId);
        const snap = await getDoc(eventRef);

        if (!snap.exists()) throw new Error("Event not found");
        if (snap.data().userId !== uid) throw new Error("Not authorized");

        // Delete associated reminders
        await personalCalendarService.deleteReminders(eventId);

        await deleteDoc(eventRef);
    },

    /**
     * Get a single event by ID.
     */
    getEvent: async (eventId: string): Promise<CalendarEvent | null> => {
        const eventRef = doc(db, 'calendar_events', eventId);
        const snap = await getDoc(eventRef);
        
        if (!snap.exists()) return null;
        return { id: snap.id, ...snap.data() } as CalendarEvent;
    },

    /**
     * Get all events for the current user within a date range.
     */
    getEvents: async (startDate: Date, endDate: Date): Promise<CalendarEvent[]> => {
        const user = auth.currentUser;
        if (!user) return [];

        const eventsRef = collection(db, 'calendar_events');
        const q = query(
            eventsRef,
            where('userId', '==', user.uid),
            where('startDate', '>=', Timestamp.fromDate(startDate)),
            where('startDate', '<=', Timestamp.fromDate(endDate)),
            orderBy('startDate', 'asc')
        );

        const snap = await getDocs(q);
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as CalendarEvent));
    },

    /**
     * Get events for a specific month.
     */
    getEventsForMonth: async (year: number, month: number): Promise<CalendarEvent[]> => {
        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, month + 1, 0, 23, 59, 59);
        return personalCalendarService.getEvents(startDate, endDate);
    },

    /**
     * Get events for a specific day.
     */
    getEventsForDay: async (date: Date): Promise<CalendarEvent[]> => {
        const startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);
        return personalCalendarService.getEvents(startDate, endDate);
    },

    /**
     * Subscribe to calendar events in real-time.
     */
    subscribeToEvents: (
        startDate: Date,
        endDate: Date,
        onUpdate: (events: CalendarEvent[]) => void
    ) => {
        const user = auth.currentUser;
        if (!user) {
            onUpdate([]);
            return () => {};
        }

        const eventsRef = collection(db, 'calendar_events');
        const q = query(
            eventsRef,
            where('userId', '==', user.uid),
            where('startDate', '>=', Timestamp.fromDate(startDate)),
            where('startDate', '<=', Timestamp.fromDate(endDate)),
            orderBy('startDate', 'asc')
        );

        return onSnapshot(q, (snapshot) => {
            const events = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as CalendarEvent));
            onUpdate(events);
        }, (error) => {
            console.error("Error subscribing to calendar:", error);
            onUpdate([]);
        });
    },

    /**
     * Sync a community event to personal calendar.
     */
    syncCommunityEvent: async (communityEvent: CommunityEvent): Promise<string> => {
        const user = auth.currentUser;
        if (!user) throw new Error("User not authenticated");

        // Check if already synced
        const eventsRef = collection(db, 'calendar_events');
        const existingQuery = query(
            eventsRef,
            where('userId', '==', user.uid),
            where('linkedEventId', '==', communityEvent.id)
        );
        const existingSnap = await getDocs(existingQuery);

        if (!existingSnap.empty) {
            // Update existing synced event
            const existingId = existingSnap.docs[0].id;
            await personalCalendarService.updateEvent(existingId, {
                title: communityEvent.title,
                description: communityEvent.description,
                location: communityEvent.location,
                startDate: communityEvent.date,
                endDate: communityEvent.endDate || communityEvent.date
            });
            return existingId;
        }

        // Create new synced event
        return personalCalendarService.createEvent({
            title: communityEvent.title,
            description: communityEvent.description,
            location: communityEvent.location,
            startDate: communityEvent.date,
            endDate: communityEvent.endDate || communityEvent.date,
            type: 'community',
            recurrence: 'none',
            linkedEventId: communityEvent.id,
            reminders: [60, 1440] // 1 hour and 1 day before
        });
    },

    /**
     * Remove synced community event from personal calendar.
     */
    unsyncCommunityEvent: async (communityEventId: string): Promise<void> => {
        const user = auth.currentUser;
        if (!user) throw new Error("User not authenticated");

        const eventsRef = collection(db, 'calendar_events');
        const q = query(
            eventsRef,
            where('userId', '==', user.uid),
            where('linkedEventId', '==', communityEventId)
        );
        const snap = await getDocs(q);

        if (!snap.empty) {
            await personalCalendarService.deleteEvent(snap.docs[0].id);
        }
    },

    /**
     * Check if a community event is synced to personal calendar.
     */
    isEventSynced: async (communityEventId: string): Promise<boolean> => {
        const user = auth.currentUser;
        if (!user) return false;

        const eventsRef = collection(db, 'calendar_events');
        const q = query(
            eventsRef,
            where('userId', '==', user.uid),
            where('linkedEventId', '==', communityEventId)
        );
        const snap = await getDocs(q);
        return !snap.empty;
    },

    /**
     * Create a loan milestone event.
     */
    createLoanMilestone: async (
        applicationId: string,
        title: string,
        description: string,
        dueDate: Date
    ): Promise<string> => {
        return personalCalendarService.createEvent({
            title: `📋 ${title}`,
            description,
            startDate: Timestamp.fromDate(dueDate),
            endDate: Timestamp.fromDate(dueDate),
            allDay: true,
            type: 'loan_milestone',
            recurrence: 'none',
            linkedApplicationId: applicationId,
            reminders: [1440, 4320] // 1 day and 3 days before
        });
    },

    /**
     * Get all loan milestone events for an application.
     */
    getLoanMilestones: async (applicationId: string): Promise<CalendarEvent[]> => {
        const user = auth.currentUser;
        if (!user) return [];

        const eventsRef = collection(db, 'calendar_events');
        const q = query(
            eventsRef,
            where('userId', '==', user.uid),
            where('linkedApplicationId', '==', applicationId),
            orderBy('startDate', 'asc')
        );

        const snap = await getDocs(q);
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as CalendarEvent));
    },

    /**
     * Mark a milestone as completed.
     */
    completeMilestone: async (eventId: string): Promise<void> => {
        await personalCalendarService.updateEvent(eventId, { completed: true });
    },

    /**
     * Generate recurring event instances for display.
     * Note: This generates virtual instances - actual recurring events are stored once.
     */
    expandRecurringEvents: (
        events: CalendarEvent[],
        rangeStart: Date,
        rangeEnd: Date
    ): CalendarEvent[] => {
        const expanded: CalendarEvent[] = [];

        for (const event of events) {
            if (event.recurrence === 'none') {
                expanded.push(event);
                continue;
            }

            // Generate instances within the range
            const instances = personalCalendarService.generateRecurrenceInstances(
                event,
                rangeStart,
                rangeEnd
            );
            expanded.push(...instances);
        }

        return expanded.sort((a, b) => {
            const aTime = a.startDate instanceof Timestamp ? a.startDate.toMillis() : 0;
            const bTime = b.startDate instanceof Timestamp ? b.startDate.toMillis() : 0;
            return aTime - bTime;
        });
    },

    /**
     * Generate instances of a recurring event within a date range.
     */
    generateRecurrenceInstances: (
        event: CalendarEvent,
        rangeStart: Date,
        rangeEnd: Date
    ): CalendarEvent[] => {
        const instances: CalendarEvent[] = [];
        const eventStart = event.startDate instanceof Timestamp 
            ? event.startDate.toDate() 
            : new Date();
        const eventEnd = event.endDate instanceof Timestamp
            ? event.endDate.toDate()
            : eventStart;
        const duration = eventEnd.getTime() - eventStart.getTime();

        const recurrenceEnd = event.recurrenceEndDate instanceof Timestamp
            ? event.recurrenceEndDate.toDate()
            : rangeEnd;

        let currentDate = new Date(eventStart);
        let instanceCount = 0;
        const maxInstances = 100; // Safety limit

        while (currentDate <= recurrenceEnd && currentDate <= rangeEnd && instanceCount < maxInstances) {
            if (currentDate >= rangeStart) {
                const instanceStart = new Date(currentDate);
                const instanceEnd = new Date(currentDate.getTime() + duration);

                instances.push({
                    ...event,
                    id: `${event.id}_${instanceCount}`,
                    startDate: Timestamp.fromDate(instanceStart),
                    endDate: Timestamp.fromDate(instanceEnd)
                });
            }

            // Advance to next occurrence
            switch (event.recurrence) {
                case 'daily':
                    currentDate.setDate(currentDate.getDate() + 1);
                    break;
                case 'weekly':
                    currentDate.setDate(currentDate.getDate() + 7);
                    break;
                case 'biweekly':
                    currentDate.setDate(currentDate.getDate() + 14);
                    break;
                case 'monthly':
                    currentDate.setMonth(currentDate.getMonth() + 1);
                    break;
                case 'yearly':
                    currentDate.setFullYear(currentDate.getFullYear() + 1);
                    break;
                default:
                    return instances;
            }
            instanceCount++;
        }

        return instances;
    },

    // =====================
    // Reminder Management
    // =====================

    /**
     * Create reminders for an event.
     */
    createReminders: async (
        eventId: string,
        eventStart: Timestamp,
        minutesBefore: number[]
    ): Promise<void> => {
        const user = auth.currentUser;
        if (!user) return;

        const batch = writeBatch(db);
        const remindersRef = collection(db, 'calendar_reminders');
        const eventStartDate = eventStart.toDate();

        for (const minutes of minutesBefore) {
            const reminderTime = new Date(eventStartDate.getTime() - minutes * 60 * 1000);
            
            // Only create future reminders
            if (reminderTime > new Date()) {
                const reminderDoc = doc(remindersRef);
                batch.set(reminderDoc, {
                    eventId,
                    userId: user.uid,
                    scheduledFor: Timestamp.fromDate(reminderTime),
                    sent: false,
                    createdAt: serverTimestamp()
                });
            }
        }

        await batch.commit();
    },

    /**
     * Delete all reminders for an event.
     */
    deleteReminders: async (eventId: string): Promise<void> => {
        const remindersRef = collection(db, 'calendar_reminders');
        const q = query(remindersRef, where('eventId', '==', eventId));
        const snap = await getDocs(q);

        const batch = writeBatch(db);
        snap.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
    },

    /**
     * Get pending reminders for the current user.
     */
    getPendingReminders: async (): Promise<CalendarReminder[]> => {
        const user = auth.currentUser;
        if (!user) return [];

        const now = new Date();
        const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);

        const remindersRef = collection(db, 'calendar_reminders');
        const q = query(
            remindersRef,
            where('userId', '==', user.uid),
            where('sent', '==', false),
            where('scheduledFor', '<=', Timestamp.fromDate(inOneHour)),
            orderBy('scheduledFor', 'asc')
        );

        const snap = await getDocs(q);
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as CalendarReminder));
    },

    /**
     * Mark a reminder as sent.
     */
    markReminderSent: async (reminderId: string): Promise<void> => {
        const reminderRef = doc(db, 'calendar_reminders', reminderId);
        await updateDoc(reminderRef, { sent: true });
    },

    // =====================
    // Utility Functions
    // =====================

    /**
     * Get upcoming events (next 7 days).
     */
    getUpcomingEvents: async (): Promise<CalendarEvent[]> => {
        const now = new Date();
        const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        return personalCalendarService.getEvents(now, nextWeek);
    },

    /**
     * Get today's events.
     */
    getTodayEvents: async (): Promise<CalendarEvent[]> => {
        return personalCalendarService.getEventsForDay(new Date());
    },

    /**
     * Get events by type.
     */
    getEventsByType: async (type: CalendarEventType): Promise<CalendarEvent[]> => {
        const user = auth.currentUser;
        if (!user) return [];

        const eventsRef = collection(db, 'calendar_events');
        const q = query(
            eventsRef,
            where('userId', '==', user.uid),
            where('type', '==', type),
            orderBy('startDate', 'asc')
        );

        const snap = await getDocs(q);
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as CalendarEvent));
    },

    /**
     * Quick create a task with due date.
     */
    createTask: async (title: string, dueDate: Date, description?: string): Promise<string> => {
        return personalCalendarService.createEvent({
            title,
            description,
            startDate: Timestamp.fromDate(dueDate),
            endDate: Timestamp.fromDate(dueDate),
            allDay: true,
            type: 'task',
            recurrence: 'none',
            reminders: [60] // 1 hour before
        });
    },

    /**
     * Get calendar stats for dashboard.
     */
    getCalendarStats: async (): Promise<{
        todayCount: number;
        weekCount: number;
        pendingMilestones: number;
        overdueCount: number;
    }> => {
        const user = auth.currentUser;
        if (!user) return { todayCount: 0, weekCount: 0, pendingMilestones: 0, overdueCount: 0 };

        const [today, upcoming, milestones] = await Promise.all([
            personalCalendarService.getTodayEvents(),
            personalCalendarService.getUpcomingEvents(),
            personalCalendarService.getEventsByType('loan_milestone')
        ]);

        const now = new Date();
        const overdue = milestones.filter(m => {
            if (m.completed) return false;
            const startDate = m.startDate instanceof Timestamp ? m.startDate.toDate() : new Date();
            return startDate < now;
        });

        const pending = milestones.filter(m => !m.completed);

        return {
            todayCount: today.length,
            weekCount: upcoming.length,
            pendingMilestones: pending.length,
            overdueCount: overdue.length
        };
    }
};
