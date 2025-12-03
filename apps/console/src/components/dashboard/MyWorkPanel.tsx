import { useState, useEffect } from 'react';
import { Calendar, Mail, Clock, ChevronRight } from 'lucide-react';
import { useMsal } from "@azure/msal-react";
import { GraphService, type GraphEvent, type GraphEmail } from '../../services/graphService';

export default function MyWorkPanel() {
    const { instance, accounts } = useMsal();
    const [graphService, setGraphService] = useState<GraphService | null>(null);
    const [meetings, setMeetings] = useState<GraphEvent[]>([]);
    const [emails, setEmails] = useState<GraphEmail[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (accounts.length > 0) {
            const service = new GraphService(instance, accounts[0]);
            setGraphService(service);

            setLoading(true);
            Promise.all([
                service.getUpcomingEvents(8), // Next 8 hours
                service.getRecentEmails(5)    // Top 5 emails
            ]).then(([events, msgs]) => {
                setMeetings(events);
                setEmails(msgs);
            }).catch(console.error)
                .finally(() => setLoading(false));
        }
    }, [instance, accounts]);

    if (!graphService || (meetings.length === 0 && emails.length === 0 && !loading)) {
        return null; // Hide if no data or not logged in
    }

    return (
        <div className="bg-white border-b border-gray-200 p-4 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Clock className="w-5 h-5 mr-2 text-primary" />
                My Work Today
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Upcoming Meetings */}
                <div className="space-y-3">
                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider flex items-center">
                        <Calendar className="w-4 h-4 mr-2" />
                        Upcoming Meetings
                    </h3>
                    {loading ? (
                        <div className="text-sm text-gray-400">Loading schedule...</div>
                    ) : meetings.length > 0 ? (
                        <div className="space-y-2">
                            {meetings.map(meeting => (
                                <div key={meeting.id} className="flex items-start p-3 bg-blue-50 rounded-md border border-blue-100">
                                    <div className="min-w-[60px] text-center mr-3">
                                        <div className="text-xs font-bold text-blue-800">
                                            {new Date(meeting.start.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        <div className="text-[10px] text-blue-600">
                                            {new Date(meeting.end.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-sm font-medium text-blue-900">{meeting.subject}</div>
                                        {meeting.isOnlineMeeting && (
                                            <a href={meeting.onlineMeeting?.joinUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">
                                                Join Teams Meeting
                                            </a>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-sm text-gray-400 italic">No meetings for the rest of the day.</div>
                    )}
                </div>

                {/* Important Emails */}
                <div className="space-y-3">
                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider flex items-center">
                        <Mail className="w-4 h-4 mr-2" />
                        Recent Emails
                    </h3>
                    {loading ? (
                        <div className="text-sm text-gray-400">Loading emails...</div>
                    ) : emails.length > 0 ? (
                        <div className="space-y-2">
                            {emails.map(email => (
                                <div key={email.id} className="flex items-start p-3 bg-gray-50 rounded-md border border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer">
                                    <div className="mr-3 mt-0.5">
                                        {!email.isRead && <div className="w-2 h-2 bg-blue-500 rounded-full" />}
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <div className="flex justify-between items-center mb-0.5">
                                            <span className="text-xs font-medium text-gray-900 truncate">{email.from.emailAddress.name}</span>
                                            <span className="text-[10px] text-gray-500">{new Date(email.receivedDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <div className="text-sm text-gray-800 truncate">{email.subject}</div>
                                        <div className="text-xs text-gray-500 truncate">{email.bodyPreview}</div>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-gray-400 ml-2" />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-sm text-gray-400 italic">No recent emails.</div>
                    )}
                </div>
            </div>
        </div>
    );
}
