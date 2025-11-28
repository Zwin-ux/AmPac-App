import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Clock, AlertTriangle, FileText, User as UserIcon } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import type { Application, User } from '../types';
import DocumentList from '../components/documents/DocumentList';
import MessageThread from '../components/communication/MessageThread';
import { loanService } from '../services/loanService';

export default function ApplicationDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [application, setApplication] = useState<Application | null>(null);
    const [borrower, setBorrower] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'profile' | 'documents' | 'tasks' | 'communication'>('overview');

    useEffect(() => {
        const fetchData = async () => {
            if (!id) return;
            try {
                const appData = await loanService.getApplication(id);
                setApplication(appData);

                // Fetch borrower details if available
                if (appData?.userId) {
                    const userDoc = await getDoc(doc(db, 'users', appData.userId));
                    if (userDoc.exists()) {
                        setBorrower({ uid: userDoc.id, ...userDoc.data() } as User);
                    }
                }
            } catch (error) {
                console.error("Error fetching application details:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    const handleStatusChange = async (newStatus: Application['status']) => {
        if (!application) return;
        const success = await loanService.updateStatus(application.id, newStatus);
        if (success) {
            setApplication({ ...application, status: newStatus });
        }
    };

    if (loading) return <div className="p-8 text-textSecondary">Loading application...</div>;
    if (!application) return <div className="p-8 text-textSecondary">Application not found.</div>;

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <header className="bg-surface border-b border-border px-8 py-6">
                <button onClick={() => navigate('/')} className="flex items-center text-textSecondary hover:text-primary mb-4">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Queue
                </button>
                <div className="flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-2xl font-bold text-primary">{application.businessName || 'Unnamed Business'}</h1>
                            <span className="px-2 py-1 bg-surfaceHighlight border border-border rounded text-xs font-mono text-textSecondary">
                                {application.id}
                            </span>
                        </div>
                        <div className="flex items-center gap-6 text-sm text-textSecondary">
                            <div className="flex items-center">
                                <UserIcon className="w-4 h-4 mr-2" />
                                {borrower?.fullName || 'Unknown Borrower'}
                            </div>
                            <div className="flex items-center">
                                <FileText className="w-4 h-4 mr-2" />
                                {application.type?.replace('_', ' ').toUpperCase()}
                            </div>
                            <div className="flex items-center">
                                <Clock className="w-4 h-4 mr-2" />
                                Last updated: {new Date(application.lastUpdated.seconds * 1000).toLocaleDateString()}
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <select
                            value={application.status}
                            onChange={(e) => handleStatusChange(e.target.value as Application['status'])}
                            className="bg-surface border border-border rounded-md px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-primary outline-none"
                        >
                            <option value="draft">Draft</option>
                            <option value="submitted">Submitted</option>
                            <option value="in_review">In Review</option>
                            <option value="conditional_approval">Conditional Approval</option>
                            <option value="sba_submitted">SBA Submitted</option>
                            <option value="sba_approved">SBA Approved</option>
                            <option value="closing">Closing</option>
                            <option value="funded">Funded</option>
                            <option value="rejected">Rejected</option>
                            <option value="withdrawn">Withdrawn</option>
                        </select>
                        <button className="bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primaryLight">
                            Save Changes
                        </button>
                    </div>
                </div>
            </header>

            {/* Tabs */}
            <div className="bg-surface border-b border-border px-8">
                <nav className="flex gap-6">
                    {['overview', 'profile', 'documents', 'tasks', 'communication'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === tab
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-textSecondary hover:text-primary'
                                }`}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-auto bg-surfaceHighlight p-8">
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                            <section className="bg-surface p-6 rounded-lg border border-border shadow-subtle">
                                <h3 className="text-lg font-semibold mb-4">Loan Details</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-textSecondary uppercase mb-1">Requested Amount</label>
                                        <p className="text-lg font-mono">${(application.requestedAmount || application.loanAmount)?.toLocaleString() || '0'}</p>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-textSecondary uppercase mb-1">Use of Funds</label>
                                        <p className="text-lg">{application.useOfFunds || 'Not specified'}</p>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-textSecondary uppercase mb-1">Annual Revenue</label>
                                        <p className="text-lg font-mono">${application.annualRevenue?.toLocaleString() || '0'}</p>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-textSecondary uppercase mb-1">Years in Business</label>
                                        <p className="text-lg">{application.yearsInBusiness || 0} years</p>
                                    </div>
                                </div>
                            </section>

                            <section className="bg-surface p-6 rounded-lg border border-border shadow-subtle">
                                <h3 className="text-lg font-semibold mb-4">Risk Assessment</h3>
                                <div className="flex flex-wrap gap-2">
                                    {application.flags?.map((flag, i) => (
                                        <span key={i} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                            <AlertTriangle className="w-3 h-3 mr-1" />
                                            {flag.replace('_', ' ').toUpperCase()}
                                        </span>
                                    )) || <p className="text-textSecondary text-sm">No risk flags detected.</p>}
                                </div>
                            </section>
                        </div>

                        <div className="space-y-6">
                            <section className="bg-surface p-6 rounded-lg border border-border shadow-subtle">
                                <h3 className="text-lg font-semibold mb-4">Timeline</h3>
                                <div className="space-y-4">
                                    <div className="flex gap-3">
                                        <div className="mt-1"><CheckCircle className="w-5 h-5 text-success" /></div>
                                        <div>
                                            <p className="text-sm font-medium">Application Created</p>
                                            <p className="text-xs text-textSecondary">{new Date(application.createdAt.seconds * 1000).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    {/* Placeholder for real timeline events */}
                                </div>
                            </section>
                        </div>
                    </div>
                )}

                {activeTab === 'documents' && <DocumentList application={application} />}

                {activeTab === 'communication' && <MessageThread application={application} />}

                {(activeTab === 'profile' || activeTab === 'tasks') && (
                    <div className="flex items-center justify-center h-64 text-textSecondary">
                        {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} view coming soon.
                    </div>
                )}
            </div>
        </div>
    );
}
