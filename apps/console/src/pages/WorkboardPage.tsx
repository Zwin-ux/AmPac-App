import { useEffect, useState } from 'react';
import { loanService } from '../services/loanService';
import type { Application, ApplicationStatus } from '../types';
import { useNavigate } from 'react-router-dom';
import MyWorkPanel from '../components/dashboard/MyWorkPanel';

const STATUS_COLUMNS: { title: string; statuses: ApplicationStatus[] }[] = [
    { title: 'New / Submitted', statuses: ['submitted', 'draft'] },
    { title: 'In Review', statuses: ['in_review', 'sba_submitted'] },
    { title: 'Approved', statuses: ['conditional_approval', 'sba_approved'] },
    { title: 'Closing / Funded', statuses: ['closing', 'funded'] },
];

export default function WorkboardPage() {
    const [applications, setApplications] = useState<Application[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        console.log('Subscribing to pipeline...');
        setLoading(true);
        const unsubscribe = loanService.subscribeToPipeline({}, (data) => {
            console.log('Pipeline updated:', data.length);
            setApplications(data);
            setLoading(false);
        });

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, []);

    const handleCardClick = (id: string) => {
        navigate(`/applications/${id}`);
    };

    if (loading) {
        return <div className="p-8 text-center">Loading pipeline...</div>;
    }

    return (
        <div className="h-full flex flex-col p-6">
            <header className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Pipeline Workboard</h1>
                    <p className="text-sm text-gray-500">Real-time view of all active applications</p>
                </div>
                {/* Real-time view, no refresh needed */}
            </header>

            <MyWorkPanel />

            <div className="flex-1 overflow-x-auto">
                <div className="flex gap-6 min-w-max h-full pb-4">
                    {STATUS_COLUMNS.map((column) => (
                        <div key={column.title} className="w-80 flex flex-col bg-gray-50 rounded-lg border border-gray-200 h-full">
                            <div className="p-3 border-b border-gray-200 bg-gray-100 rounded-t-lg">
                                <h3 className="font-semibold text-gray-700 flex justify-between">
                                    {column.title}
                                    <span className="bg-gray-200 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                                        {applications.filter(app => column.statuses.includes(app.status)).length}
                                    </span>
                                </h3>
                            </div>
                            <div className="p-3 flex-1 overflow-y-auto space-y-3">
                                {applications
                                    .filter(app => column.statuses.includes(app.status))
                                    .map(app => (
                                        <div
                                            key={app.id}
                                            onClick={() => handleCardClick(app.id)}
                                            className="bg-white p-4 rounded-md shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                                                    {app.type || 'Loan'}
                                                </span>
                                                {app.venturesLoanId && (
                                                    <span className="text-[10px] text-gray-400 font-mono">
                                                        #{app.venturesLoanId}
                                                    </span>
                                                )}
                                            </div>
                                            <h4 className="font-medium text-gray-900 mb-1 truncate">
                                                {app.businessName || 'Unnamed Business'}
                                            </h4>
                                            <p className="text-sm text-gray-500 mb-3">
                                                {app.loanAmount
                                                    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(app.loanAmount)
                                                    : 'Amount TBD'}
                                            </p>

                                            <div className="flex items-center justify-between text-xs text-gray-400 border-t pt-2 mt-2">
                                                <span>{app.assignedTo ? 'Assigned' : 'Unassigned'}</span>
                                                <span>{app.lastUpdated?.seconds ? new Date(app.lastUpdated.seconds * 1000).toLocaleDateString() : 'Just now'}</span>
                                            </div>
                                        </div>
                                    ))}

                                {applications.filter(app => column.statuses.includes(app.status)).length === 0 && (
                                    <div className="text-center py-8 text-gray-400 text-sm italic">
                                        No applications
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
