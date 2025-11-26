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

let roomsCache: Room[] | null = null;

import { cacheService } from './cache';

const CACHE_KEY_ROOMS = 'cache_rooms';

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
                    description: 'Perfect for board meetings and client presentations.'
                },
                {
                    id: 'room-2',
                    name: 'Focus Pod',
                    capacity: 1,
                    pricePerHour: 15,
                    amenities: ['WiFi', 'Soundproof'],
                    description: 'Quiet space for deep work.'
                },
                {
                    id: 'room-3',
                    name: 'Training Center',
                    capacity: 20,
                    pricePerHour: 100,
                    amenities: ['WiFi', 'Projector', 'Whiteboard', 'Catering'],
                    description: 'Large space for workshops and training sessions.'
                }
            ];
            // Save to persistent cache
            await cacheService.set(CACHE_KEY_ROOMS, roomsCache);
            return roomsCache;
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
        const bookingsCol = collection(db, 'bookings');
        const docRef = await addDoc(bookingsCol, booking);
        return docRef.id;
    } catch (error) {
        console.error("Error creating booking:", error);
        throw error;
    }
};
