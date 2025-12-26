import { addDoc, collection, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { Booking, BookingItem } from '../types';

const HOLD_DURATION_MS = 10 * 60 * 1000;

const overlaps = (aStart: Timestamp, aEnd: Timestamp, bStart: Timestamp, bEnd: Timestamp) => {
    return aStart.toMillis() < bEnd.toMillis() && aEnd.toMillis() > bStart.toMillis();
};

const flattenBookingItems = (booking: Booking): BookingItem[] => {
    if (booking.items && booking.items.length > 0) return booking.items;
    const legacyBooking = booking as any;
    if (legacyBooking.roomId && legacyBooking.startTime && legacyBooking.endTime) {
        return [{
            roomId: legacyBooking.roomId,
            startTime: legacyBooking.startTime,
            endTime: legacyBooking.endTime,
            status: booking.status,
        }];
    }
    return [];
};

export const availabilityService = {
    async checkItemsAvailability(items: BookingItem[]) {
        const bookingsSnapshot = await getDocs(collection(db, 'bookings'));
        const holdsSnapshot = await getDocs(collection(db, 'holds'));

        const now = Timestamp.now();
        const activeBookings = bookingsSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as Booking))
            .filter(b => b.status !== 'cancelled');

        const activeHolds = holdsSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as any))
            .filter(h => h.expiresAt && (h.expiresAt as Timestamp).toMillis() > now.toMillis());

        const conflicts: { roomId: string; reason: string }[] = [];

        for (const item of items) {
            for (const booking of activeBookings) {
                const bookingItems = flattenBookingItems(booking);
                for (const bItem of bookingItems) {
                    if (bItem.roomId === item.roomId && bItem.startTime && bItem.endTime && item.startTime && item.endTime) {
                        if (overlaps(item.startTime, item.endTime, bItem.startTime, bItem.endTime)) {
                            conflicts.push({ roomId: item.roomId, reason: 'Existing booking' });
                            break;
                        }
                    }
                }
            }

            for (const hold of activeHolds) {
                const holdItems: BookingItem[] = hold.items || [];
                for (const hItem of holdItems) {
                    if (hItem.roomId === item.roomId && hItem.startTime && hItem.endTime && item.startTime && item.endTime) {
                        if (overlaps(item.startTime, item.endTime, hItem.startTime, hItem.endTime)) {
                            conflicts.push({ roomId: item.roomId, reason: 'On hold by another user' });
                            break;
                        }
                    }
                }
            }
        }

        return { ok: conflicts.length === 0, conflicts };
    },

    async holdRooms(items: BookingItem[], expiresAt?: Timestamp) {
        const holdExpiresAt = expiresAt ?? Timestamp.fromMillis(Date.now() + HOLD_DURATION_MS);
        const holdDoc = {
            items,
            expiresAt: holdExpiresAt,
            createdAt: Timestamp.now(),
        };
        const ref = await addDoc(collection(db, 'holds'), holdDoc);
        return { holdId: ref.id, expiresAt: holdExpiresAt };
    },
};
