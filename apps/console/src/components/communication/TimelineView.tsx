import { MessageSquare, Mail, Calendar } from 'lucide-react';
import type { Application } from '../../types';

interface TimelineViewProps {
    application: Application;
}

export default function TimelineView({ application }: TimelineViewProps) {
    // Mock timeline data (replace with real events when available)
    const events = [
        { id: 1, type: 'email', title: 'Documents Received', date: '2023-10-26T14:30:00', description: 'Received tax returns for 2022.' },
        { id: 2, type: 'meeting', title: 'Intro Call', date: '2023-10-25T10:00:00', description: 'Discussed loan requirements and timeline.' },
        { id: 3, type: 'note', title: 'Internal Note', date: '2023-10-24T16:15:00', description: 'Client mentioned they might need more funds.' },
    ];

    if (!application) return null;

    return (
        <div className="p-6 overflow-y-auto h-full">
            <h3 className="text-lg font-semibold mb-2">Activity Timeline</h3>
            <p className="text-xs text-textSecondary mb-4">
                Application: {application.businessName || application.id}
            </p>
            <div className="relative border-l-2 border-border ml-3 space-y-8">
                {events.map((event) => (
                    <div key={event.id} className="relative pl-8">
                        <div
                            className={`absolute -left-[9px] top-0 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center
                            ${event.type === 'email' ? 'bg-blue-500' : event.type === 'meeting' ? 'bg-purple-500' : 'bg-yellow-500'}
                        `}
                        >
                            {event.type === 'email' && <Mail className="w-3 h-3 text-white" />}
                            {event.type === 'meeting' && <Calendar className="w-3 h-3 text-white" />}
                            {event.type === 'note' && <MessageSquare className="w-3 h-3 text-white" />}
                        </div>

                        <div className="bg-white p-4 rounded-lg border border-border shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="font-medium text-primary">{event.title}</h4>
                                <span className="text-xs text-textSecondary">
                                    {new Date(event.date).toLocaleDateString()}
                                </span>
                            </div>
                            <p className="text-sm text-textSecondary">{event.description}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
