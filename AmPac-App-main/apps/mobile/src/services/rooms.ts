import {
    collection,
    getDocs,
    doc,
    getDoc,
    addDoc,
    query,
    where,
    Timestamp
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { Room, Booking } from '../types';
import { cacheService } from './cache';

let roomsCache: Room[] | null = null;

const CACHE_KEY_ROOMS = 'cache_rooms';

const buildMockPricingRules = (room: Room) => ([
    {
        id: `${room.id}-tier`,
        type: 'hourly_tier' as const,
        priority: 10,
        tiers: [
            { upToHours: 3, rate: room.pricePerHour, label: 'Standard' },
            { minHours: 3, rate: Math.round(room.pricePerHour * 0.85), label: 'Half-day' },
            { minHours: 8, rate: Math.round(room.pricePerHour * 0.75), label: 'Day rate' },
        ],
    },
    {
        id: `${room.id}-peak`,
        type: 'peak' as const,
        priority: 8,
        peakStartHour: 8,
        peakEndHour: 18,
        multiplier: 1.1,
    },
    {
        id: `${room.id}-weekend`,
        type: 'weekend' as const,
        priority: 7,
        multiplier: 1.05,
    }
]);

const normalizeBookingPayload = (booking: Omit<Booking, 'id'>): Omit<Booking, 'id'> => {
    if (booking.items && booking.items.length > 0) return booking;

    const legacyBooking = booking as any;
    const items = (legacyBooking.roomId && legacyBooking.startTime && legacyBooking.endTime)
        ? [{
            roomId: legacyBooking.roomId,
            startTime: legacyBooking.startTime,
            endTime: legacyBooking.endTime,
            status: booking.status,
        }]
        : [];

    return {
        ...booking,
        items,
    };
};

export const getRooms = async (forceRefresh = false): Promise<Room[]> => {
    // 1. Try to get from memory first (fastest)
    if (roomsCache && !forceRefresh) {
        return roomsCache;
    }

    // 2. Try to get from persistent cache (fast)
    if (!forceRefresh) {
        const cached = await cacheService.get<Room[]>(CACHE_KEY_ROOMS);
        if (cached) {
            roomsCache = cached;
            // Return cached data immediately, but trigger background refresh if needed?
            // For now, just return it to be fast.
            return cached;
        }
    }

    // 3. Fetch from Firestore (slow)
    try {
        const roomsCol = collection(db, 'rooms');
        const snapshot = await getDocs(roomsCol);
        const rooms = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Room));

        // AmPac Business Capital actual rooms
        if (rooms.length === 0) {
            roomsCache = [
                {
                    id: 'resource-partner-conference-room',
                    name: 'Resource Partner Conference Room',
                    capacity: 12,
                    pricePerHour: 75,
                    amenities: ['4K Display', 'Video Conferencing', 'Whiteboard', 'WiFi', 'Conference Phone', 'Presentation Remote', 'Coffee Service'],
                    description: 'Professional conference room designed for resource partner meetings, client presentations, and strategic planning sessions. Features premium AV equipment and comfortable seating for up to 12 participants.',
                    location: 'AmPac Business Capital HQ',
                    timezone: 'America/Los_Angeles',
                    graphResourceId: 'resource-partner-conference@ampac.com',
                    pricingRules: buildMockPricingRules({ id: 'resource-partner-conference-room', name: 'Resource Partner Conference Room', capacity: 12, pricePerHour: 75, amenities: [] }),
                },
                {
                    id: 'collaboration-center-conference-room',
                    name: 'Collaboration Center Conference Room',
                    capacity: 8,
                    pricePerHour: 60,
                    amenities: ['Smart TV', 'Video Conferencing', 'Whiteboard', 'WiFi', 'Wireless Presentation', 'Natural Light', 'Ergonomic Seating'],
                    description: 'Modern collaboration space perfect for team meetings, brainstorming sessions, and client consultations. Designed to foster creativity and productive discussions with flexible seating arrangements.',
                    location: 'AmPac Business Capital HQ',
                    timezone: 'America/Los_Angeles',
                    graphResourceId: 'collaboration-center-conference@ampac.com',
                    pricingRules: buildMockPricingRules({ id: 'collaboration-center-conference-room', name: 'Collaboration Center Conference Room', capacity: 8, pricePerHour: 60, amenities: [] }),
                },
                {
                    id: 'business-acumen-center',
                    name: 'Business Acumen Center',
                    capacity: 20,
                    pricePerHour: 100,
                    amenities: ['Dual Projectors', 'Sound System', 'Microphones', 'WiFi', 'Whiteboard', 'Flip Charts', 'Training Materials', 'Catering Setup'],
                    description: 'Comprehensive training and education center designed for workshops, seminars, and business development sessions. Ideal for entrepreneur training programs, SBA workshops, and large group presentations.',
                    location: 'AmPac Business Capital HQ',
                    timezone: 'America/Los_Angeles',
                    graphResourceId: 'business-acumen-center@ampac.com',
                    pricingRules: buildMockPricingRules({ id: 'business-acumen-center', name: 'Business Acumen Center', capacity: 20, pricePerHour: 100, amenities: [] }),
                }
            ];
            // Save to persistent cache
            await cacheService.set(CACHE_KEY_ROOMS, roomsCache);
            return roomsCache!;
        }

        roomsCache = rooms;
        await cacheService.set(CACHE_KEY_ROOMS, rooms);
        return rooms;
    } catch (error) {
        console.error("Error fetching rooms:", error);
        return [];
    }
};

export const createBooking = async (booking: Omit<Booking, 'id'>): Promise<string> => {
    try {
        const normalized = normalizeBookingPayload(booking);
        const bookingsCol = collection(db, 'bookings');
        const docRef = await addDoc(bookingsCol, normalized);
        return docRef.id;
    } catch (error) {
        console.error("Error creating booking:", error);
        throw error;
    }
};
