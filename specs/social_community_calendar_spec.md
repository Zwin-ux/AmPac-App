# Social/Community System & Calendar Feature Specification

**Version:** 1.0  
**Date:** December 22, 2025  
**Status:** Draft

---

## Executive Summary

This spec outlines improvements to the existing social/community system and introduces a comprehensive calendar feature for the AmPac mobile app. The goal is to enhance user engagement, improve event discovery, and provide business owners with better networking and scheduling tools.

---

## Part 1: Social/Community System Improvements

### 1.1 Current State Analysis

**What exists:**
- `SocialHubScreen.tsx` - Main social hub with feed, channels, events
- `feedService.ts` - Post creation, likes, feed subscription
- `chatService.ts` - Channel creation, messaging, reactions
- `events.ts` - Event CRUD, RSVP functionality
- `businessService.ts` - Business profiles, team management
- Firestore collections: `posts`, `events`, `comments`, `channels`, `businesses`, `reports`

**Current limitations:**
- No algorithmic feed personalization
- Limited content discovery
- No hashtags or topic categorization
- No verified business badges
- No direct messaging between businesses
- Basic notification system

---

### 1.2 Proposed Enhancements

#### A. Enhanced Feed Algorithm

**New Firestore Structure:**
```
users/{userId}/feedPreferences
├── interests: string[]           // e.g., ["restaurant", "funding", "marketing"]
├── mutedUsers: string[]
├── followedBusinesses: string[]
├── engagementHistory: {
│     postId: string,
│     action: "view" | "like" | "comment" | "share",
│     timestamp: Timestamp
│   }[]
```

**Engagement Score Calculation:**
```typescript
interface EngagementMetrics {
  likes: number;
  comments: number;
  shares: number;
  views: number;
  recency: number;  // Hours since posted
  authorReputation: number;
}

// Score formula
const calculateEngagementScore = (m: EngagementMetrics): number => {
  const interactionScore = (m.likes * 1) + (m.comments * 3) + (m.shares * 5);
  const decayFactor = Math.exp(-m.recency / 48); // Half-life of 48 hours
  return (interactionScore * decayFactor) + (m.authorReputation * 0.1);
};
```

**Implementation:**
- Cloud Function triggered on post interactions to recalculate `engagementScore`
- Client-side feed fetches `posts` ordered by `engagementScore DESC`
- Personalization layer filters based on `feedPreferences`

---

#### B. Hashtags & Topics

**Firestore Structure:**
```
posts/{postId}
├── hashtags: string[]            // e.g., ["funding", "sba504", "restaurant"]
├── topics: string[]              // Admin-curated categories

hashtags/{tag}
├── postCount: number
├── lastUsed: Timestamp
├── trending: boolean

topics/{topicId}
├── name: string
├── description: string
├── iconUrl: string
├── followerCount: number
├── moderators: string[]          // User IDs
```

**New Service Methods:**
```typescript
// feedService.ts additions
export const feedService = {
  // ... existing methods

  searchByHashtag: async (tag: string, limit = 20): Promise<FeedPost[]> => {
    const q = query(
      collection(db, 'posts'),
      where('hashtags', 'array-contains', tag),
      orderBy('createdAt', 'desc'),
      limit(limit)
    );
    // ...
  },

  getTrendingHashtags: async (limit = 10): Promise<string[]> => {
    const q = query(
      collection(db, 'hashtags'),
      where('trending', '==', true),
      orderBy('postCount', 'desc'),
      limit(limit)
    );
    // ...
  },

  followTopic: async (topicId: string): Promise<void> => {
    // Add to user preferences, increment follower count
  }
};
```

---

#### C. Business Verification & Badges

**Firestore Structure:**
```
businesses/{businessId}
├── verified: boolean
├── verifiedAt: Timestamp
├── verificationMethod: "document" | "loan_funded" | "manual"
├── badges: string[]              // e.g., ["verified", "sba_funded", "top_contributor"]
├── trustScore: number            // 0-100

badges/{badgeId}
├── name: string
├── description: string
├── iconUrl: string
├── criteria: {
│     type: "loan_status" | "engagement" | "manual",
│     threshold?: number
│   }
```

**Auto-Badge Assignment (Cloud Function):**
```typescript
// triggers/badges.ts
export const checkBadgeEligibility = functions.firestore
  .document('applications/{appId}')
  .onUpdate(async (change, context) => {
    const newData = change.after.data();
    if (newData.status === 'funded') {
      const userId = newData.userId;
      await db.collection('users').doc(userId).update({
        badges: arrayUnion('sba_funded')
      });
      await db.collection('businesses').doc(userId).update({
        badges: arrayUnion('sba_funded'),
        verified: true,
        verifiedAt: serverTimestamp(),
        verificationMethod: 'loan_funded'
      });
    }
  });
```

---

#### D. Enhanced Messaging

**New Firestore Structure:**
```
directMessages/{dmId}
├── participants: string[]        // [userId1, userId2] or [businessId1, businessId2]
├── participantType: "user" | "business"
├── lastMessage: {
│     text: string,
│     senderId: string,
│     timestamp: Timestamp
│   }
├── unreadCount: { [participantId]: number }
├── createdAt: Timestamp

directMessages/{dmId}/messages/{messageId}
├── senderId: string
├── text: string
├── attachments: { type: string, url: string }[]
├── readBy: string[]
├── createdAt: Timestamp
```

**New Service:**
```typescript
// dmService.ts
export const dmService = {
  startConversation: async (targetId: string, isBusinessChat = false) => {
    const user = auth.currentUser;
    if (!user) throw new Error("Auth required");
    
    // Check if DM already exists
    const existingDm = await findExistingDm(user.uid, targetId);
    if (existingDm) return existingDm.id;
    
    // Create new DM
    const dmRef = await addDoc(collection(db, 'directMessages'), {
      participants: [user.uid, targetId].sort(), // Consistent ordering
      participantType: isBusinessChat ? 'business' : 'user',
      lastMessage: null,
      unreadCount: { [user.uid]: 0, [targetId]: 0 },
      createdAt: serverTimestamp()
    });
    return dmRef.id;
  },

  sendMessage: async (dmId: string, text: string, attachments = []) => {
    // Add message, update lastMessage, increment unread
  },

  subscribeToMessages: (dmId: string, onUpdate: (msgs: Message[]) => void) => {
    // Real-time listener
  },

  markAsRead: async (dmId: string) => {
    // Reset unread count for current user
  }
};
```

---

#### E. Content Moderation Improvements

**Enhanced Report System:**
```
reports/{reportId}
├── reporterId: string
├── targetId: string
├── targetType: "post" | "comment" | "message" | "user" | "business"
├── reason: "spam" | "harassment" | "misinformation" | "inappropriate" | "other"
├── description: string
├── evidence: string[]            // Screenshot URLs
├── status: "pending" | "reviewing" | "resolved" | "dismissed"
├── assignedTo: string            // Staff user ID
├── resolution: string
├── createdAt: Timestamp
├── resolvedAt: Timestamp
```

**Auto-Moderation (Cloud Function):**
```typescript
// triggers/moderation.ts
export const autoModerateContent = functions.firestore
  .document('posts/{postId}')
  .onCreate(async (snap, context) => {
    const post = snap.data();
    
    // Check for banned words, spam patterns
    const flags = await analyzeContent(post.content);
    
    if (flags.length > 0) {
      await snap.ref.update({
        flagged: true,
        flagReasons: flags,
        visible: false // Hide until reviewed
      });
      
      // Notify moderators
      await createModerationTask(context.params.postId, flags);
    }
  });
```

---

## Part 2: Calendar Feature

### 2.1 Overview

A comprehensive calendar system that integrates:
- Community events (from `events` collection)
- Personal appointments/reminders
- Business availability scheduling
- Loan milestone dates
- Microsoft/Google calendar sync (optional)

---

### 2.2 Firestore Schema

```
calendars/{userId}
├── defaultView: "month" | "week" | "day" | "agenda"
├── timezone: string
├── syncedCalendars: {
│     provider: "google" | "microsoft" | "apple",
│     calendarId: string,
│     syncEnabled: boolean,
│     lastSynced: Timestamp
│   }[]
├── settings: {
│     showCommunityEvents: boolean,
│     showLoanMilestones: boolean,
│     reminderDefaults: number[]     // Minutes before: [15, 60, 1440]
│   }

calendarEvents/{eventId}
├── userId: string
├── title: string
├── description: string
├── startTime: Timestamp
├── endTime: Timestamp
├── allDay: boolean
├── location: string
├── type: "personal" | "community" | "loan_milestone" | "business_hours"
├── color: string
├── recurrence: {
│     frequency: "daily" | "weekly" | "monthly" | "yearly",
│     interval: number,
│     endDate?: Timestamp,
│     count?: number,
│     daysOfWeek?: number[]         // 0=Sunday, 6=Saturday
│   }
├── reminders: {
│     method: "push" | "email",
│     minutes: number
│   }[]
├── linkedEventId: string           // Reference to community event if synced
├── linkedApplicationId: string     // Reference to loan application
├── attendees: string[]
├── visibility: "private" | "public"
├── createdAt: Timestamp
├── updatedAt: Timestamp

# Business availability (for scheduling meetings)
businessAvailability/{businessId}
├── weeklySchedule: {
│     [dayOfWeek: number]: {
│       available: boolean,
│       slots: { start: string, end: string }[]  // "09:00", "17:00"
│     }
│   }
├── exceptions: {
│     date: string,                 // "2025-12-25"
│     available: boolean,
│     reason?: string
│   }[]
├── appointmentDuration: number     // Default minutes
├── bufferTime: number              // Minutes between appointments
```

---

### 2.3 Calendar Service

```typescript
// calendarService.ts
import { 
  collection, query, where, orderBy, 
  getDocs, addDoc, updateDoc, deleteDoc,
  Timestamp, serverTimestamp 
} from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';

export interface CalendarEvent {
  id: string;
  userId: string;
  title: string;
  description?: string;
  startTime: Timestamp;
  endTime: Timestamp;
  allDay: boolean;
  location?: string;
  type: 'personal' | 'community' | 'loan_milestone' | 'business_hours';
  color?: string;
  recurrence?: RecurrenceRule;
  reminders?: Reminder[];
  linkedEventId?: string;
  linkedApplicationId?: string;
  visibility: 'private' | 'public';
}

export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  endDate?: Timestamp;
  count?: number;
  daysOfWeek?: number[];
}

export interface Reminder {
  method: 'push' | 'email';
  minutes: number;
}

export const calendarService = {
  /**
   * Get events for a date range
   */
  getEvents: async (
    startDate: Date, 
    endDate: Date,
    types?: CalendarEvent['type'][]
  ): Promise<CalendarEvent[]> => {
    const user = auth.currentUser;
    if (!user) throw new Error('Auth required');

    const eventsRef = collection(db, 'calendarEvents');
    let q = query(
      eventsRef,
      where('userId', '==', user.uid),
      where('startTime', '>=', Timestamp.fromDate(startDate)),
      where('startTime', '<=', Timestamp.fromDate(endDate)),
      orderBy('startTime', 'asc')
    );

    const snapshot = await getDocs(q);
    let events = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as CalendarEvent));

    // Filter by types if specified
    if (types && types.length > 0) {
      events = events.filter(e => types.includes(e.type));
    }

    // Expand recurring events
    events = expandRecurringEvents(events, startDate, endDate);

    return events;
  },

  /**
   * Create a new calendar event
   */
  createEvent: async (event: Omit<CalendarEvent, 'id' | 'userId'>): Promise<string> => {
    const user = auth.currentUser;
    if (!user) throw new Error('Auth required');

    const docRef = await addDoc(collection(db, 'calendarEvents'), {
      ...event,
      userId: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // Schedule reminders
    if (event.reminders && event.reminders.length > 0) {
      await scheduleReminders(docRef.id, event);
    }

    return docRef.id;
  },

  /**
   * Update an existing event
   */
  updateEvent: async (eventId: string, updates: Partial<CalendarEvent>): Promise<void> => {
    const eventRef = doc(db, 'calendarEvents', eventId);
    await updateDoc(eventRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  },

  /**
   * Delete an event (or single instance of recurring)
   */
  deleteEvent: async (eventId: string, deleteType: 'single' | 'all' = 'all'): Promise<void> => {
    const eventRef = doc(db, 'calendarEvents', eventId);
    
    if (deleteType === 'all') {
      await deleteDoc(eventRef);
    } else {
      // Add exception date for recurring event
      const eventSnap = await getDoc(eventRef);
      const eventData = eventSnap.data();
      // ... add exception logic
    }
  },

  /**
   * Sync community events to personal calendar
   */
  syncCommunityEvent: async (communityEventId: string): Promise<string> => {
    const user = auth.currentUser;
    if (!user) throw new Error('Auth required');

    // Fetch community event
    const eventSnap = await getDoc(doc(db, 'events', communityEventId));
    if (!eventSnap.exists()) throw new Error('Event not found');

    const communityEvent = eventSnap.data();

    // Create calendar event linked to community event
    return await calendarService.createEvent({
      title: communityEvent.title,
      description: communityEvent.description,
      startTime: communityEvent.date,
      endTime: communityEvent.date, // Or calculate based on duration
      allDay: false,
      location: communityEvent.location,
      type: 'community',
      color: '#7C3AED', // Purple for community
      linkedEventId: communityEventId,
      visibility: 'private',
      reminders: [{ method: 'push', minutes: 60 }]
    });
  },

  /**
   * Create loan milestone events
   */
  createLoanMilestones: async (applicationId: string): Promise<void> => {
    const user = auth.currentUser;
    if (!user) throw new Error('Auth required');

    // Fetch application
    const appSnap = await getDoc(doc(db, 'applications', applicationId));
    if (!appSnap.exists()) return;

    const app = appSnap.data();
    const milestones = calculateLoanMilestones(app);

    for (const milestone of milestones) {
      await calendarService.createEvent({
        title: milestone.title,
        description: milestone.description,
        startTime: Timestamp.fromDate(milestone.date),
        endTime: Timestamp.fromDate(milestone.date),
        allDay: true,
        type: 'loan_milestone',
        color: '#10B981', // Green for milestones
        linkedApplicationId: applicationId,
        visibility: 'private',
        reminders: [
          { method: 'push', minutes: 1440 }, // 1 day before
          { method: 'email', minutes: 4320 } // 3 days before
        ]
      });
    }
  },

  /**
   * Get business availability for scheduling
   */
  getBusinessAvailability: async (
    businessId: string, 
    date: Date
  ): Promise<TimeSlot[]> => {
    const availRef = doc(db, 'businessAvailability', businessId);
    const availSnap = await getDoc(availRef);
    
    if (!availSnap.exists()) {
      return getDefaultSlots(); // Return 9-5 M-F
    }

    const avail = availSnap.data();
    const dayOfWeek = date.getDay();
    const dateStr = date.toISOString().split('T')[0];

    // Check exceptions first
    const exception = avail.exceptions?.find(e => e.date === dateStr);
    if (exception && !exception.available) {
      return [];
    }

    // Get weekly schedule for this day
    const daySchedule = avail.weeklySchedule?.[dayOfWeek];
    if (!daySchedule?.available) {
      return [];
    }

    // Convert to available slots
    return daySchedule.slots.map(slot => ({
      start: slot.start,
      end: slot.end,
      available: true
    }));
  },

  /**
   * Subscribe to real-time calendar updates
   */
  subscribeToEvents: (
    startDate: Date,
    endDate: Date,
    onUpdate: (events: CalendarEvent[]) => void
  ) => {
    const user = auth.currentUser;
    if (!user) return () => {};

    const eventsRef = collection(db, 'calendarEvents');
    const q = query(
      eventsRef,
      where('userId', '==', user.uid),
      where('startTime', '>=', Timestamp.fromDate(startDate)),
      where('startTime', '<=', Timestamp.fromDate(endDate)),
      orderBy('startTime', 'asc')
    );

    return onSnapshot(q, (snapshot) => {
      const events = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as CalendarEvent));
      onUpdate(expandRecurringEvents(events, startDate, endDate));
    });
  }
};

// Helper functions
function expandRecurringEvents(
  events: CalendarEvent[], 
  startDate: Date, 
  endDate: Date
): CalendarEvent[] {
  const expanded: CalendarEvent[] = [];
  
  for (const event of events) {
    if (!event.recurrence) {
      expanded.push(event);
      continue;
    }

    // Generate instances based on recurrence rule
    const instances = generateRecurrenceInstances(event, startDate, endDate);
    expanded.push(...instances);
  }

  return expanded.sort((a, b) => 
    a.startTime.toMillis() - b.startTime.toMillis()
  );
}

function calculateLoanMilestones(app: any): { title: string; description: string; date: Date }[] {
  const milestones = [];
  const createdAt = app.createdAt?.toDate() || new Date();

  // Example milestones
  milestones.push({
    title: '📋 Document Collection Due',
    description: 'All required documents should be submitted',
    date: addDays(createdAt, 7)
  });

  milestones.push({
    title: '🔍 Underwriting Review',
    description: 'Your application is being reviewed',
    date: addDays(createdAt, 14)
  });

  milestones.push({
    title: '✅ Expected Decision Date',
    description: 'Anticipated approval/decision',
    date: addDays(createdAt, 30)
  });

  return milestones;
}
```

---

### 2.4 Calendar UI Components

#### CalendarScreen.tsx
```typescript
// screens/CalendarScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns';
import { theme } from '../theme';
import { calendarService, CalendarEvent } from '../services/calendarService';
import { CalendarDay } from '../components/calendar/CalendarDay';
import { EventCard } from '../components/calendar/EventCard';
import { CreateEventModal } from '../components/calendar/CreateEventModal';

export default function CalendarScreen() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'agenda'>('month');

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const start = startOfMonth(currentMonth);
      const end = endOfMonth(currentMonth);
      const fetchedEvents = await calendarService.getEvents(start, end);
      setEvents(fetchedEvents);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  useEffect(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    
    const unsubscribe = calendarService.subscribeToEvents(start, end, (newEvents) => {
      setEvents(newEvents);
      setLoading(false);
    });

    return unsubscribe;
  }, [currentMonth]);

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });

  const selectedDayEvents = events.filter(e => 
    isSameDay(e.startTime.toDate(), selectedDate)
  );

  const getEventsForDay = (date: Date) => 
    events.filter(e => isSameDay(e.startTime.toDate(), date));

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setCurrentMonth(subMonths(currentMonth, 1))}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.monthTitle}>{format(currentMonth, 'MMMM yyyy')}</Text>
        <TouchableOpacity onPress={() => setCurrentMonth(addMonths(currentMonth, 1))}>
          <Ionicons name="chevron-forward" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      {/* View Mode Toggle */}
      <View style={styles.viewToggle}>
        {(['month', 'week', 'agenda'] as const).map(mode => (
          <TouchableOpacity
            key={mode}
            style={[styles.toggleBtn, viewMode === mode && styles.toggleBtnActive]}
            onPress={() => setViewMode(mode)}
          >
            <Text style={[styles.toggleText, viewMode === mode && styles.toggleTextActive]}>
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Calendar Grid */}
      {viewMode === 'month' && (
        <View style={styles.calendarGrid}>
          {/* Day headers */}
          <View style={styles.dayHeaders}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <Text key={day} style={styles.dayHeader}>{day}</Text>
            ))}
          </View>
          
          {/* Days */}
          <View style={styles.daysGrid}>
            {days.map(day => (
              <CalendarDay
                key={day.toISOString()}
                date={day}
                events={getEventsForDay(day)}
                isSelected={isSameDay(day, selectedDate)}
                isToday={isSameDay(day, new Date())}
                onPress={() => setSelectedDate(day)}
              />
            ))}
          </View>
        </View>
      )}

      {/* Selected Day Events */}
      <View style={styles.eventsSection}>
        <View style={styles.eventsSectionHeader}>
          <Text style={styles.eventsTitle}>
            {format(selectedDate, 'EEEE, MMMM d')}
          </Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => setShowCreateModal(true)}
          >
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {selectedDayEvents.length === 0 ? (
          <View style={styles.noEvents}>
            <Ionicons name="calendar-outline" size={48} color={theme.colors.textSecondary} />
            <Text style={styles.noEventsText}>No events scheduled</Text>
          </View>
        ) : (
          <FlatList
            data={selectedDayEvents}
            keyExtractor={item => item.id}
            renderItem={({ item }) => <EventCard event={item} />}
            contentContainerStyle={styles.eventsList}
          />
        )}
      </View>

      {/* Create Event Modal */}
      <CreateEventModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        initialDate={selectedDate}
        onEventCreated={fetchEvents}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12 
  },
  monthTitle: { fontSize: 18, fontWeight: '600', color: theme.colors.text },
  viewToggle: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    padding: 4
  },
  toggleBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  toggleBtnActive: { backgroundColor: theme.colors.primary },
  toggleText: { fontSize: 14, color: theme.colors.textSecondary },
  toggleTextActive: { color: '#fff', fontWeight: '600' },
  calendarGrid: { paddingHorizontal: 8 },
  dayHeaders: { flexDirection: 'row', marginBottom: 8 },
  dayHeader: { 
    flex: 1, 
    textAlign: 'center', 
    fontSize: 12, 
    color: theme.colors.textSecondary 
  },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  eventsSection: { flex: 1, marginTop: 16 },
  eventsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12
  },
  eventsTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
  addButton: {
    backgroundColor: theme.colors.primary,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center'
  },
  noEvents: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  noEventsText: { marginTop: 8, color: theme.colors.textSecondary },
  eventsList: { paddingHorizontal: 16 }
});
```

---

### 2.5 Required Firestore Indexes

```json
// firestore.indexes.json additions
{
  "indexes": [
    {
      "collectionGroup": "calendarEvents",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "startTime", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "calendarEvents",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "type", "order": "ASCENDING" },
        { "fieldPath": "startTime", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "posts",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "hashtags", "arrayConfig": "CONTAINS" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

---

## Part 3: Implementation Phases

### Phase 1: Core Calendar (Week 1-2)
- [ ] Create `calendarService.ts`
- [ ] Create `CalendarScreen.tsx` and sub-components
- [ ] Add calendar to bottom tab navigation
- [ ] Implement basic CRUD for personal events
- [ ] Add Firestore indexes

### Phase 2: Event Integration (Week 3)
- [ ] Sync community events to calendar
- [ ] Create loan milestone auto-generation
- [ ] Add event reminders (push notifications)
- [ ] Implement recurring events

### Phase 3: Social Enhancements (Week 4-5)
- [ ] Add hashtag system to posts
- [ ] Implement enhanced feed algorithm
- [ ] Create DM service and UI
- [ ] Add business verification badges

### Phase 4: Advanced Features (Week 6)
- [ ] Business availability scheduling
- [ ] External calendar sync (Microsoft Graph)
- [ ] Content moderation improvements
- [ ] Performance optimization

---

## Part 4: Console Dashboard Updates

Add these pages to `apps/console`:

1. **Community Analytics Dashboard**
   - Active users over time
   - Post/comment volume
   - Engagement metrics
   - Trending hashtags

2. **Moderation Queue**
   - Flagged content review
   - User reports
   - Ban management
   - Content removal logs

3. **Event Management**
   - Create/edit community events
   - RSVP tracking
   - Featured events

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Daily Active Users (Social) | TBD | +50% |
| Posts per Week | TBD | +100% |
| Event RSVPs | TBD | +75% |
| Calendar Adoption | 0% | 60% of users |
| DM Conversations/Week | 0 | 50+ |

---

## Open Questions

1. Should calendar sync with external calendars be MVP or Phase 2?
2. Do we need a separate moderator role or can staff handle it?
3. What's the business meeting scheduling flow? (Who can request?)
4. Should hashtags be user-created or curated only?

---

*Spec Author: AI Assistant*  
*Review Required: Product Owner, Engineering Lead*
