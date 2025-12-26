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

        // Fallback mock data if empty (for MVP demo)
        if (rooms.length === 0) {
            roomsCache = [
                {
                    id: 'room-1',
                    name: 'Conference Room A',
                    capacity: 8,
                    pricePerHour: 50,
                    amenities: ['WiFi', 'Projector', 'Whiteboard'],
                    description: 'Perfect for board meetings and client presentations.',
                    location: 'Riverside HQ',
                    timezone: 'America/Los_Angeles',
                    graphResourceId: 'graph-room-1',
                    pricingRules: buildMockPricingRules({ id: 'room-1', name: 'Conference Room A', capacity: 8, pricePerHour: 50, amenities: [] }),
                },
                {
                    id: 'room-2',
                    name: 'Focus Pod',
                    capacity: 1,
                    pricePerHour: 15,
                    amenities: ['WiFi', 'Soundproof'],
                    description: 'Quiet space for deep work.',
                    location: 'Riverside HQ',
                    timezone: 'America/Los_Angeles',
                    graphResourceId: 'graph-room-2',
                    pricingRules: buildMockPricingRules({ id: 'room-2', name: 'Focus Pod', capacity: 1, pricePerHour: 15, amenities: [] }),
                },
                {
                    id: 'room-3',
                    name: 'Training Center',
                    capacity: 20,
                    pricePerHour: 100,
                    amenities: ['WiFi', 'Projector', 'Whiteboard', 'Catering'],
                    description: 'Large space for workshops and training sessions.',
                    location: 'Ontario Hub',
                    timezone: 'America/Los_Angeles',
                    graphResourceId: 'graph-room-3',
                    pricingRules: buildMockPricingRules({ id: 'room-3', name: 'Training Center', capacity: 20, pricePerHour: 100, amenities: [] }),
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
