import { Event } from '../types';

// Mock data
let MOCK_EVENTS: Event[] = [
    {
        id: '1',
        title: 'AmPac Holiday Mixer',
        description: 'Celebrate the season with fellow entrepreneurs! Food, drinks, and networking opportunities galore.',
        date: new Date(Date.now() + 86400000 * 1).toISOString(), // Tomorrow
        location: 'AmPac Innovation Center - Main Hall',
        organizerId: 'ampac_admin',
        organizerName: 'Hilda Kennedy',
        attendees: ['user1', 'user2', 'user4', 'user5']
    },
    {
        id: '2',
        title: 'SBA 504 Loan Webinar',
        description: 'Everything you need to know about purchasing commercial real estate with 10% down.',
        date: new Date(Date.now() + 86400000 * 3).toISOString(), // 3 days
        location: 'Online (Zoom)',
        organizerId: 'expert_1',
        organizerName: 'Ed Ryan',
        attendees: ['user3', 'user6']
    },
    {
        id: '3',
        title: 'Women in Business Breakfast',
        description: 'A morning of inspiration and connection for women business owners in the Inland Empire.',
        date: new Date(Date.now() + 86400000 * 7).toISOString(), // 1 week
        location: 'Riverside Convention Center',
        organizerId: 'expert_2',
        organizerName: 'Nicole J. Jones',
        attendees: ['user7', 'user8', 'user9']
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
