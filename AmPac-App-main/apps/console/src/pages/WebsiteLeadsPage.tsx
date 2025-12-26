import { useEffect, useState } from 'react';
import { leadsService, type WebsiteLead } from '../services/leadsService';

const formatCsvDate = (date: Date) => date.toISOString().slice(0, 16).replace('T', ' ');
const formatUiDate = (date: Date) => date.toLocaleString();

export default function WebsiteLeadsPage() {
    const [leads, setLeads] = useState<WebsiteLead[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            const data = await leadsService.listLeads();
            setLeads(data);
            setLoading(false);
        };
        load();
    }, []);

    const downloadCsv = () => {
        const header = ['Name', 'Email', 'Message', 'SiteId', 'Slug', 'CreatedAt'];
        const rows = leads.map(l => [
            `"${l.name || ''}"`,
            `"${l.email || ''}"`,
            `"${(l.message || '').replace(/"/g, '""')}"`,
            `"${l.siteId || ''}"`,
            `"${l.slug || ''}"`,
            `"${l.createdAt ? formatCsvDate(l.createdAt.toDate()) : ''}"`
        ]);
        const csv = [header.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'website_leads.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-primary">Website Leads</h1>
                    <p className="text-textSecondary">Inbound messages from published sites.</p>
                </div>
                <button
                    onClick={downloadCsv}
                    className="px-4 py-2 bg-primary text-white rounded-md text-sm font-semibold hover:bg-primary/90"
                    disabled={!leads.length}
                >
                    Export CSV
                </button>
            </div>

            {loading ? (
                <div className="text-textSecondary">Loading leads...</div>
            ) : !leads.length ? (
                <div className="text-textSecondary">No leads yet.</div>
            ) : (
                <div className="overflow-auto rounded-lg border border-border bg-surface">
                    <table className="min-w-full text-sm">
                        <thead className="bg-surfaceHighlight text-textSecondary">
                            <tr>
                                <th className="text-left px-4 py-3">Name</th>
                                <th className="text-left px-4 py-3">Email</th>
                                <th className="text-left px-4 py-3">Message</th>
                                <th className="text-left px-4 py-3">Site</th>
                                <th className="text-left px-4 py-3">Created</th>
                            </tr>
                        </thead>
                        <tbody>
                            {leads.map((lead) => (
                                <tr key={lead.id} className="border-t border-border">
                                    <td className="px-4 py-3 font-semibold">{lead.name}</td>
                                    <td className="px-4 py-3 text-primary">{lead.email}</td>
                                    <td className="px-4 py-3 max-w-xs truncate" title={lead.message}>{lead.message}</td>
                                    <td className="px-4 py-3 text-textSecondary">{lead.slug || lead.siteId}</td>
                                    <td className="px-4 py-3 text-textSecondary">
                                        {lead.createdAt ? formatUiDate(lead.createdAt.toDate()) : ''}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
