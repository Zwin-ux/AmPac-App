import { API_URL } from '../config';

export interface TimeSlot {
    startTime: string;
    endTime: string;
    isConflicting: boolean;
}

export interface AvailabilityPayload {
    busy: TimeSlot[];
    suggested?: { startTime: string; endTime: string }[];
    timeZone?: string;
}

export interface BookingResponse {
    eventId: string;
    joinUrl: string;
}

export const calendarService = {
    getAvailableSlots: async (staffEmail: string, durationMinutes: number, start?: string, end?: string): Promise<AvailabilityPayload> => {
        try {
            const response = await fetch(`${API_URL}/calendar/available`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ staffEmail, durationMinutes, start, end })
            });
            if (!response.ok) throw new Error('Failed to fetch slots');
            const data = await response.json();
            // Backward compatibility: API may return an array or an object with busy/suggested
            if (Array.isArray(data)) {
                return { busy: data as TimeSlot[], suggested: [], timeZone: 'UTC' };
            }
            return {
                busy: (data?.busy as TimeSlot[]) || [],
                suggested: data?.suggested || [],
                timeZone: data?.timeZone || 'UTC'
            };
        } catch (error) {
            console.error("Error fetching slots:", error);
            return { busy: [], suggested: [], timeZone: 'UTC' };
        }
    },

    bookMeeting: async (staffEmail: string, borrowerEmail: string, durationMinutes: number, chosenStartTime: string): Promise<BookingResponse> => {
        const response = await fetch(`${API_URL}/calendar/book`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ staffEmail, borrowerEmail, durationMinutes, chosenStartTime })
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || 'Booking failed');
        }
        return await response.json();
    }
};
