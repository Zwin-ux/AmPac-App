import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Filter, AlertTriangle, Clock } from 'lucide-react';
import { loanService } from '../services/loanService';
import type { Application } from '../types';

export default function WorkboardPage() {
    const navigate = useNavigate();
    const [applications, setApplications] = useState<Application[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPipeline = async () => {
            try {
                const data = await loanService.getPipeline();
                setApplications(data);
            } catch (error) {
                console.error("Error loading pipeline:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchPipeline();
    }, []);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'submitted': return 'bg-blue-100 text-blue-800';
            case 'in_review': return 'bg-yellow-100 text-yellow-800';
            case 'approved': return 'bg-green-100 text-green-800';
            case 'sba_approved': return 'bg-green-100 text-green-800';
            case 'rejected': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const formatCurrency = (amount?: number) => {
        return amount ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount) : '-';
    };

    return (
        <div className="p-8">
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-primary">My Queue</h1>
                    <p className="text-textSecondary mt-1">Manage your assigned applications</p>
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center px-4 py-2 bg-surface border border-border rounded-md text-sm font-medium hover:bg-surfaceHighlight">
                        <Filter className="w-4 h-4 mr-2" />
                        Filter
                    </button>
                    <button className="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primaryLight">
                        New Application
                    </button>
                </div>
            </header>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                {[
                    { label: 'Total Assigned', value: applications.length.toString() },
                    { label: 'Pending Review', value: applications.filter(a => a.status === 'submitted' || a.status === 'in_review').length.toString(), highlight: true },
                    { label: 'Approved', value: applications.filter(a => a.status === 'conditional_approval' || a.status === 'sba_approved').length.toString() },
                    { label: 'Drafts', value: applications.filter(a => a.status === 'draft').length.toString() },
                ].map((stat, i) => (
                    <div key={i} className="bg-surface p-4 rounded-lg border border-border shadow-subtle">
                        <p className="text-sm font-medium text-textSecondary uppercase tracking-wider">{stat.label}</p>
                        <p className={`text-3xl font-bold mt-2 ${stat.highlight ? 'text-accent' : 'text-primary'}`}>{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Applications Table */}
            <div className="bg-surface rounded-lg border border-border shadow-subtle overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-textSecondary">Loading pipeline...</div>
                ) : applications.length === 0 ? (
                    <div className="p-8 text-center text-textSecondary">No applications found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-surfaceHighlight border-b border-border">
                                <tr>
                                    <th className="px-6 py-3 font-medium text-textSecondary uppercase tracking-wider">App ID</th>
                                    <th className="px-6 py-3 font-medium text-textSecondary uppercase tracking-wider">Business Name</th>
                                    <th className="px-6 py-3 font-medium text-textSecondary uppercase tracking-wider">Amount</th>
                                    <th className="px-6 py-3 font-medium text-textSecondary uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 font-medium text-textSecondary uppercase tracking-wider">Flags</th>
                                    <th className="px-6 py-3 font-medium text-textSecondary uppercase tracking-wider">Last Updated</th>
                                    <th className="px-6 py-3 font-medium text-textSecondary uppercase tracking-wider">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {applications.map((app) => (
                                    <tr key={app.id} className="hover:bg-surfaceHighlight transition-colors">
                                        <td className="px-6 py-4 font-mono text-textSecondary text-xs">{app.id?.substring(0, 8) || 'Unknown'}...</td>
                                        <td className="px-6 py-4 font-medium text-primary">
                                            {app.businessName || 'Unnamed Business'}
                                            <div className="text-xs text-textSecondary font-normal mt-0.5">{app.type?.replace('_', ' ').toUpperCase()}</div>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-textSecondary">{formatCurrency(app.requestedAmount || app.loanAmount)}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(app.status)}`}>
                                                {app.status?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-1">
                                                {app.flags?.map((flag, i) => (
                                                    <span key={i} title={flag} className="w-2 h-2 rounded-full bg-red-500"></span>
                                                ))}
                                                {!app.flags?.length && <span className="text-textSecondary">-</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-textSecondary">
                                            <div className="flex items-center">
                                                <Clock className="w-3 h-3 mr-1" />
                                                {app.lastUpdated ? new Date(app.lastUpdated.seconds * 1000).toLocaleDateString() : '-'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => navigate(`/applications/${app.id}`)}
                                                className="text-primary font-medium hover:underline"
                                            >
                                                View
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
