import { useState, useEffect } from 'react';
import { Mail, Sparkles } from 'lucide-react';
import type { Application } from '../../types';
import { GraphService, type GraphEmail } from '../../services/graphService';
import { brainService } from '../../services/brainService';

interface EmailViewProps {
    application: Application;
    graphService: GraphService | null;
}

export default function EmailView({ application, graphService }: EmailViewProps) {
    const [emails, setEmails] = useState<GraphEmail[]>([]);
    const [loading, setLoading] = useState(false);
    const [drafting, setDrafting] = useState(false);
    const [draftIntent, setDraftIntent] = useState<'approve' | 'request_docs' | 'follow_up'>('follow_up');

    useEffect(() => {
        if (graphService) {
            setLoading(true);
            graphService.getRecentEmails()
                .then(setEmails)
                .catch(console.error)
                .finally(() => setLoading(false));
        }
    }, [graphService]);

    const handleDraft = async () => {
        setDrafting(true);
        try {
            const draft = await brainService.draftEmail(application.id, draftIntent, 'professional');
            // In a real app, this would populate a compose window
            alert(`Draft Generated:\nSubject: ${draft.subject}\n\n${draft.body}`);
        } catch (error) {
            console.error("Error drafting email:", error);
        } finally {
            setDrafting(false);
        }
    };

    return (
        <div className="flex h-full">
            {/* Email List */}
            <div className="w-1/3 border-r border-border overflow-y-auto bg-surfaceHighlight">
                {loading ? (
                    <div className="p-4 text-center text-textSecondary">Loading emails...</div>
                ) : (
                    <div className="divide-y divide-border">
                        {emails.map(email => (
                            <div key={email.id} className="p-4 hover:bg-white cursor-pointer transition-colors">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-medium text-text truncate w-2/3">{email.from.emailAddress.name}</span>
                                    <span className="text-xs text-textSecondary whitespace-nowrap">
                                        {new Date(email.receivedDateTime).toLocaleDateString()}
                                    </span>
                                </div>
                                <div className="text-sm font-medium text-primary mb-1 truncate">{email.subject}</div>
                                <p className="text-xs text-textSecondary line-clamp-2">{email.bodyPreview}</p>
                            </div>
                        ))}
                        {emails.length === 0 && (
                            <div className="p-8 text-center text-textSecondary">
                                <Mail className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p>No recent emails found.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Reading/Compose Pane */}
            <div className="flex-1 flex flex-col bg-surface p-6">
                <div className="flex-1 flex items-center justify-center text-textSecondary border-2 border-dashed border-border rounded-lg mb-6">
                    Select an email to view details
                </div>

                {/* AI Composer */}
                <div className="bg-surfaceHighlight p-4 rounded-lg border border-border">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold flex items-center">
                            <Sparkles className="w-4 h-4 mr-2 text-purple-500" />
                            AI Composer
                        </h4>
                        <select
                            value={draftIntent}
                            onChange={(e) => setDraftIntent(e.target.value as any)}
                            className="text-xs p-1 rounded border border-border"
                        >
                            <option value="follow_up">Follow Up</option>
                            <option value="request_docs">Request Documents</option>
                            <option value="approve">Approval Notice</option>
                        </select>
                    </div>
                    <button
                        onClick={handleDraft}
                        disabled={drafting}
                        className="w-full py-2 bg-purple-600 text-white rounded-md text-sm font-medium hover:bg-purple-700 transition-colors flex items-center justify-center"
                    >
                        {drafting ? 'Generating Draft...' : 'Draft Response with Brain'}
                    </button>
                </div>
            </div>
        </div>
    );
}
