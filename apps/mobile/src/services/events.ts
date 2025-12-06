import { Event } from '../types';

// Mock data
let MOCK_EVENTS: Event[] = [
    {
        id: '1',
        title: 'Small Business Mixer',
        description: 'Join us for an evening of networking with local entrepreneurs.',
        date: new Date(Date.now() + 86400000 * 2).toISOString(), // 2 days from now
        location: 'AmPac Innovation Center',
        organizerId: 'ampac_admin',
        organizerName: 'AmPac Team',
        attendees: ['user1', 'user2']
    },
    {
        id: '2',
        title: 'Grant Writing Workshop',
        description: 'Learn how to write winning grant proposals for your non-profit.',
        date: new Date(Date.now() + 86400000 * 5).toISOString(), // 5 days from now
        location: 'Conference Room B',
        organizerId: 'expert_1',
        organizerName: 'Sarah Jones',
        attendees: ['user3']
    }
];

export const getEvents = async (): Promise<Event[]> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return [...MOCK_EVENTS].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

export const createEvent = async (event: Omit<Event, 'id' | 'attendees'>): Promise<Event> => {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const newEvent: Event = {
        ...event,
        id: Math.random().toString(36).substr(2, 9),
        attendees: []
    };
    
    MOCK_EVENTS.push(newEvent);
    return newEvent;
};
