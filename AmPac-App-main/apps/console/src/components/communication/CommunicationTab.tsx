import { useState, useEffect } from 'react';
import { Mail, Calendar, MessageSquare, Plus, RefreshCw } from 'lucide-react';
import type { Application } from '../../types';
import { useMsal } from "@azure/msal-react";
import { GraphService } from '../../services/graphService';
import EmailView from './EmailView';
import MeetingView from './MeetingView';
import TimelineView from './TimelineView';

interface CommunicationTabProps {
    application: Application;
}

export default function CommunicationTab({ application }: CommunicationTabProps) {
    const { instance, accounts } = useMsal();
    const [activeView, setActiveView] = useState<'timeline' | 'email' | 'meeting'>('timeline');
    const [graphService, setGraphService] = useState<GraphService | null>(null);

    useEffect(() => {
        if (accounts.length > 0) {
            setGraphService(new GraphService(instance, accounts[0]));
        }
    }, [instance, accounts]);

    return (
        <div className="flex flex-col h-[700px] bg-surface rounded-lg border border-border shadow-subtle overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-surfaceHighlight">
                <div className="flex gap-2">
                    <button
                        onClick={() => setActiveView('timeline')}
                        className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeView === 'timeline' ? 'bg-white shadow-sm text-primary' : 'text-textSecondary hover:bg-gray-200'}`}
                    >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Timeline
                    </button>
                    <button
                        onClick={() => setActiveView('email')}
                        className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeView === 'email' ? 'bg-white shadow-sm text-primary' : 'text-textSecondary hover:bg-gray-200'}`}
                    >
                        <Mail className="w-4 h-4 mr-2" />
                        Emails
                    </button>
                    <button
                        onClick={() => setActiveView('meeting')}
                        className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeView === 'meeting' ? 'bg-white shadow-sm text-primary' : 'text-textSecondary hover:bg-gray-200'}`}
                    >
                        <Calendar className="w-4 h-4 mr-2" />
                        Meetings
                    </button>
                </div>
                <div className="flex gap-2">
                    <button className="p-2 text-textSecondary hover:text-primary rounded-md hover:bg-gray-200">
                        <RefreshCw className="w-4 h-4" />
                    </button>
                    <button className="flex items-center px-3 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primaryLight shadow-sm">
                        <Plus className="w-4 h-4 mr-2" />
                        New Action
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden relative">
                {activeView === 'timeline' && <TimelineView application={application} />}
                {activeView === 'email' && <EmailView application={application} graphService={graphService} />}
                {activeView === 'meeting' && <MeetingView application={application} graphService={graphService} />}
            </div>
        </div>
    );
}
