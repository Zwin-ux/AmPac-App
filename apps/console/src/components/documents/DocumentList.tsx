import { useState } from 'react';
import { FileText, Check, X, Upload, Eye } from 'lucide-react';
import type { Application } from '../../types';

interface DocumentListProps {
    application: Application;
}

interface DocItem {
    id: string;
    name: string;
    status: 'missing' | 'uploaded' | 'approved' | 'rejected';
    uploadedAt?: string;
    url?: string;
}

// Mock data generator based on loan type
const getRequiredDocs = (type: Application['type']): DocItem[] => {
    const common = [
        { id: 'tax_returns_2022', name: '2022 Business Tax Returns', status: 'uploaded', uploadedAt: '2023-10-24' },
        { id: 'tax_returns_2021', name: '2021 Business Tax Returns', status: 'approved', uploadedAt: '2023-10-20' },
        { id: 'financial_statements', name: 'Interim Financial Statements', status: 'missing' },
        { id: 'debt_schedule', name: 'Business Debt Schedule', status: 'uploaded', uploadedAt: '2023-10-25' },
    ];

    if (type === 'sba_504') {
        return [
            ...common,
            { id: 'project_cost', name: 'Project Cost Breakdown', status: 'missing' },
            { id: 'appraisal', name: 'Real Estate Appraisal', status: 'missing' },
        ] as DocItem[];
    }

    return common as DocItem[];
};

export default function DocumentList({ application }: DocumentListProps) {
    const [docs, setDocs] = useState<DocItem[]>(() => getRequiredDocs(application.type));

    const handleStatusChange = (id: string, newStatus: DocItem['status']) => {
        setDocs(prev => prev.map(doc => doc.id === id ? { ...doc, status: newStatus } : doc));
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-primary">Required Documents</h3>
                <button className="flex items-center px-4 py-2 bg-surface border border-border rounded-md text-sm font-medium hover:bg-surfaceHighlight">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload File
                </button>
            </div>

            <div className="bg-surface rounded-lg border border-border shadow-subtle overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-surfaceHighlight border-b border-border">
                        <tr>
                            <th className="px-6 py-3 font-medium text-textSecondary uppercase tracking-wider">Document Name</th>
                            <th className="px-6 py-3 font-medium text-textSecondary uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 font-medium text-textSecondary uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 font-medium text-textSecondary uppercase tracking-wider text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {docs.map((doc) => (
                            <tr key={doc.id} className="hover:bg-surfaceHighlight transition-colors">
                                <td className="px-6 py-4 font-medium text-primary flex items-center">
                                    <FileText className="w-4 h-4 mr-3 text-textSecondary" />
                                    {doc.name}
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                                        ${doc.status === 'approved' ? 'bg-green-100 text-green-800' :
                                            doc.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                                doc.status === 'uploaded' ? 'bg-blue-100 text-blue-800' :
                                                    'bg-gray-100 text-gray-800'}`}>
                                        {doc.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-textSecondary">
                                    {doc.uploadedAt || '-'}
                                </td>
                                <td className="px-6 py-4 text-right space-x-2">
                                    {doc.status === 'uploaded' && (
                                        <>
                                            <button
                                                onClick={() => handleStatusChange(doc.id, 'approved')}
                                                className="p-1 text-success hover:bg-green-50 rounded"
                                                title="Approve"
                                            >
                                                <Check className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleStatusChange(doc.id, 'rejected')}
                                                className="p-1 text-error hover:bg-red-50 rounded"
                                                title="Reject"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </>
                                    )}
                                    {doc.status !== 'missing' && (
                                        <button className="p-1 text-primary hover:bg-gray-100 rounded" title="View">
                                            <Eye className="w-4 h-4" />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
