import React, { useEffect, useState } from 'react';
import { Mail, Calendar, ExternalLink } from "lucide-react";
import { API_URL } from '../../config';
// Assuming UI components might be in a different path or need to be mocked if they don't exist.
// Based on file list, components/ui doesn't exist? Let's check.
// Actually, I didn't verify if components/ui exists. I should check.
// If not, I'll use standard HTML elements for now to avoid errors.

interface Email {
    id: string;
    subject: string;
    sender: { emailAddress: { name: string, address: string } };
    receivedDateTime: string;
    webLink: string;
}

interface Event {
    id: string;
    subject: string;
    start: { dateTime: string, timeZone: string };
    webLink: string;
}

export const M365Widgets: React.FC = () => {
    const [emails, setEmails] = useState<Email[]>([]);
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // 1. Check status
                const statusRes = await fetch(`${API_URL}/m365/status`);
                const statusData = await statusRes.json();
                setConnected(statusData.connected);

                if (statusData.connected) {
                    // 2. Fetch Dashboard Data
                    const dashboardRes = await fetch(`${API_URL}/m365/dashboard`);
                    if (dashboardRes.ok) {
                        const data = await dashboardRes.json();
                        setEmails(data.emails || []);
                        setEvents(data.events || []);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch M365 data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) {
        return <div className="p-4 text-center text-gray-500">Loading M365 Data...</div>;
    }

    if (!connected) {
        return (
            <div className="bg-white p-6 rounded-lg border shadow-sm text-center text-gray-500">
                Please connect your Microsoft 365 account to view widgets.
            </div>
        );
    }

    return (
        <div className="grid gap-4 md:grid-cols-2">
            {/* Emails Widget */}
            <div className="bg-white rounded-lg border shadow-sm">
                <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
                    <h3 className="text-sm font-medium">Recent Emails</h3>
                    <Mail className="h-4 w-4 text-gray-500" />
                </div>
                <div className="p-6 pt-0">
                    <div className="space-y-4">
                        {emails.length === 0 ? (
                            <p className="text-sm text-gray-500">No recent emails found.</p>
                        ) : (
                            emails.map(email => (
                                <div key={email.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                                    <div className="space-y-1 overflow-hidden">
                                        <p className="text-sm font-medium leading-none truncate pr-4">{email.subject}</p>
                                        <p className="text-xs text-gray-500">{email.sender.emailAddress.name}</p>
                                    </div>
                                    <a href={email.webLink} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-700 flex-shrink-0">
                                        <ExternalLink className="h-3 w-3" />
                                    </a>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Calendar Widget */}
            <div className="bg-white rounded-lg border shadow-sm">
                <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
                    <h3 className="text-sm font-medium">Upcoming Meetings</h3>
                    <Calendar className="h-4 w-4 text-gray-500" />
                </div>
                <div className="p-6 pt-0">
                    <div className="space-y-4">
                        {events.length === 0 ? (
                            <p className="text-sm text-gray-500">No upcoming meetings.</p>
                        ) : (
                            events.map(event => (
                                <div key={event.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                                    <div className="space-y-1 overflow-hidden">
                                        <p className="text-sm font-medium leading-none truncate pr-4">{event.subject}</p>
                                        <p className="text-xs text-gray-500">
                                            {new Date(event.start.dateTime).toLocaleDateString()} {new Date(event.start.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                    <a href={event.webLink} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-700 flex-shrink-0">
                                        <ExternalLink className="h-3 w-3" />
                                    </a>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
