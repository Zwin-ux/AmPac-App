import { useState, useEffect } from 'react';
import { Calendar, Clock, Video } from 'lucide-react';
import type { Application } from '../../types';
import { GraphService, type GraphEvent } from '../../services/graphService';
import { brainService } from '../../services/brainService';

interface MeetingViewProps {
    application: Application;
    graphService: GraphService | null;
}

export default function MeetingView({ graphService }: MeetingViewProps) {
    const [events, setEvents] = useState<GraphEvent[]>([]);
    const [loading, setLoading] = useState(false);
    const [proposing, setProposing] = useState(false);

    useEffect(() => {
        if (graphService) {
            setLoading(true);
            graphService.getUpcomingEvents()
                .then(setEvents)
                .catch(console.error)
                .finally(() => setLoading(false));
        }
    }, [graphService]);

    const handleProposeTime = async () => {
        setProposing(true);
        try {
            const result = await brainService.proposeMeeting(
                "borrower@example.com", // Should come from application
                ["staff@ampac.com"],
                "next week"
            );
            alert(`Proposed Slots:\n${result.slots.join('\n')}\n\nDraft Body:\n${result.draftBody}`);
        } catch (error) {
            console.error("Error proposing time:", error);
        } finally {
            setProposing(false);
        }
    };

    return (
        <div className="flex h-full">
            <div className="flex-1 p-6 overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-semibold">Upcoming Meetings</h3>
                    <button
                        onClick={handleProposeTime}
                        disabled={proposing}
                        className="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primaryLight flex items-center"
                    >
                        <Clock className="w-4 h-4 mr-2" />
                        {proposing ? 'Finding Slots...' : 'Propose Times'}
                    </button>
                </div>

                {loading ? (
                    <div className="text-center text-textSecondary">Loading calendar...</div>
                ) : (
                    <div className="space-y-4">
                        {events.map(event => (
                            <div key={event.id} className="bg-white p-4 rounded-lg border border-border shadow-sm flex justify-between items-center">
                                <div>
                                    <h4 className="font-medium text-primary mb-1">{event.subject}</h4>
                                    <div className="flex items-center text-sm text-textSecondary gap-4">
                                        <span className="flex items-center">
                                            <Calendar className="w-4 h-4 mr-1" />
                                            {new Date(event.start.dateTime).toLocaleDateString()}
                                        </span>
                                        <span className="flex items-center">
                                            <Clock className="w-4 h-4 mr-1" />
                                            {new Date(event.start.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                                {event.isOnlineMeeting && (
                                    <a
                                        href={event.onlineMeeting?.joinUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-md text-sm font-medium hover:bg-blue-100 flex items-center"
                                    >
                                        <Video className="w-4 h-4 mr-2" />
                                        Join Teams
                                    </a>
                                )}
                            </div>
                        ))}
                        {events.length === 0 && (
                            <div className="text-center py-12 bg-surfaceHighlight rounded-lg border border-dashed border-border">
                                <Calendar className="w-12 h-12 mx-auto mb-3 text-textSecondary opacity-50" />
                                <p className="text-textSecondary">No upcoming meetings found.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
