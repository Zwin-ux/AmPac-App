// Calendar Service - Brain API removed for v1 launch
// Calendar features will be available in a future update

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
    getAvailableSlots: async (_staffEmail: string, _durationMinutes: number, _start?: string, _end?: string): Promise<AvailabilityPayload> => {
        // Calendar integration coming soon - return empty availability
        console.log('[Calendar] Calendar integration coming soon');
        return { busy: [], suggested: [], timeZone: 'UTC' };
    },

    bookMeeting: async (_staffEmail: string, _durationMinutes: number, _chosenStartTime: string): Promise<BookingResponse> => {
        // Calendar integration coming soon
        console.log('[Calendar] Meeting booking coming soon');
        throw new Error('Calendar booking will be available in a future update');
    }
};
