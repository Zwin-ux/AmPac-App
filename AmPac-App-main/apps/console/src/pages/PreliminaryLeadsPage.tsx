import { useEffect, useState, useCallback } from 'react';
import { leadsService } from '../services/leadsService';
import type { PreliminaryLead } from '../types';
import { useNavigate } from 'react-router-dom';
import { Filter, Clock, UserPlus, ChevronDown, ChevronUp, MessageSquarePlus } from 'lucide-react';
import { staffMembers } from '../data/staff';
import { useMsal } from "@azure/msal-react";

export default function PreliminaryLeadsPage() {
    const [leads, setLeads] = useState<PreliminaryLead[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [expandedLead, setExpandedLead] = useState<string | null>(null);
    const [noteText, setNoteText] = useState<Record<string, string>>({});
    const navigate = useNavigate();
    const { accounts } = useMsal();
    const currentUser = accounts[0];

    const loadLeads = useCallback(async () => {
        setLoading(true);
        try {
            const data = await leadsService.listPreliminaryLeads();
            setLeads(data);
        } catch (error) {
            console.error("Failed to load leads:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadLeads();
    }, [loadLeads]);

    const handleConvert = async (lead: PreliminaryLead) => {
        if (!confirm(`Convert ${lead.fullName}'s inquiry to a formal application draft?`)) return;

        try {
            const appId = await leadsService.convertToApplication(lead);
            alert("Success! Re-routing to the new application...");
            navigate(`/applications/${appId}`);
        } catch (error) {
            console.error(error);
            alert("Failed to convert lead.");
        }
    };

    const handleStatusUpdate = async (id: string, status: PreliminaryLead['status']) => {
        try {
            await leadsService.updateLeadStatus(id, status);
            loadLeads();
        } catch (error) {
            console.error(error);
            alert("Failed to update status.");
        }
    };

    const handleAssign = async (id: string, staffId: string) => {
        try {
            await leadsService.assignLead(id, staffId);
            loadLeads();
        } catch (error) {
            console.error(error);
            alert("Failed to assign lead.");
        }
    };

    const handleAddNote = async (id: string) => {
        const text = noteText[id];
        if (!text?.trim()) return;

        try {
            await leadsService.addLeadNote(id, currentUser?.name || 'Staff Member', text);
            setNoteText(prev => ({ ...prev, [id]: '' }));
            loadLeads();
        } catch (error) {
            console.error(error);
            alert("Failed to add note.");
        }
    };

    const filteredLeads = leads.filter(l => filterStatus === 'all' || l.status === filterStatus);

    // Stats Calculation
    const stats = {
        total: leads.length,
        new: leads.filter(l => l.status === 'new').length,
        converted: leads.filter(l => l.status === 'converted').length,
        highFico: leads.filter(l => l.ficoRange === '750+' || l.ficoRange === '700-749').length
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'new': return 'bg-blue-100 text-blue-700';
            case 'reviewing': return 'bg-yellow-100 text-yellow-700';
            case 'contacted': return 'bg-purple-100 text-purple-700';
            case 'converted': return 'bg-green-100 text-green-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    return (
        <div className="p-8 space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-primary">Preliminary Leads</h1>
                    <p className="text-textSecondary">Inquiries from the mobile app's lite intake.</p>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center bg-white border border-border rounded-md px-3 py-1.5 shadow-sm">
                        <Filter className="w-4 h-4 text-textSecondary mr-2" />
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="text-sm bg-transparent border-none focus:ring-0 text-textPrimary outline-none"
                            aria-label="Filter status"
                            title="Filter status"
                        >
                            <option value="all">All Statuses</option>
                            <option value="new">New Interests</option>
                            <option value="reviewing">Reviewing</option>
                            <option value="contacted">Contacted</option>
                            <option value="converted">Converted Apps</option>
                        </select>
                    </div>
                    <button
                        onClick={loadLeads}
                        className="p-2 text-textSecondary hover:text-primary transition-colors bg-white border border-border rounded-md"
                        aria-label="Refresh leads"
                        title="Refresh leads"
                    >
                        <Clock className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Total Leads" value={stats.total} color="text-textPrimary" />
                <StatCard label="Needs Action" value={stats.new} color="text-blue-600" />
                <StatCard label="High Fico" value={stats.highFico} color="text-green-600" />
                <StatCard label="Converted" value={stats.converted} color="text-primary" />
            </div>

            {loading ? (
                <div className="flex items-center justify-center p-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            ) : !filteredLeads.length ? (
                <div className="text-center p-12 bg-white rounded-xl border border-dashed border-border">
                    <p className="text-textSecondary">No leads found matching your criteria.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredLeads.map((lead) => (
                        <div key={lead.id} className={`bg-white rounded-xl border transition-all ${expandedLead === lead.id ? 'ring-2 ring-primary border-transparent shadow-lg' : 'border-border shadow-sm'}`}>
                            <div className="p-5">
                                <div className="flex flex-col md:flex-row justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="font-bold text-lg text-textPrimary">{lead.fullName}</h3>
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${getStatusColor(lead.status)}`}>
                                                {lead.status}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-textSecondary">
                                            <span className="flex items-center">{lead.email}</span>
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {lead.createdAt?.toDate().toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center bg-surfaceHighlight rounded-md px-2 py-1">
                                            <UserPlus className="w-3 h-3 text-textSecondary mr-2" />
                                            <select
                                                value={lead.assignedTo || ''}
                                                onChange={(e) => handleAssign(lead.id, e.target.value)}
                                                className="text-[11px] bg-transparent border-none p-0 text-textPrimary focus:ring-0 outline-none font-bold"
                                                aria-label="Assign info"
                                                title="Assign Info"
                                            >
                                                <option value="">Unassigned</option>
                                                {staffMembers.map(s => (
                                                    <option key={s.email} value={s.name}>{s.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {lead.status !== 'converted' && (
                                            <button
                                                onClick={() => handleConvert(lead)}
                                                className="bg-primary text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-primary/90 shadow-sm"
                                            >
                                                Convert
                                            </button>
                                        )}

                                        <button
                                            onClick={() => setExpandedLead(expandedLead === lead.id ? null : lead.id)}
                                            className="p-2 text-textSecondary hover:bg-surfaceHighlight rounded-full transition-colors"
                                            aria-label={expandedLead === lead.id ? "Collapse" : "Expand"}
                                            title={expandedLead === lead.id ? "Collapse" : "Expand"}
                                        >
                                            {expandedLead === lead.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>

                                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <DetailBox label="FICO" value={lead.ficoRange} highlight={lead.ficoRange === '750+' || lead.ficoRange === '700-749'} />
                                    <DetailBox label="Amount" value={`$${lead.loanAmountDesired.toLocaleString()}`} />
                                    <DetailBox label="Industry" value={lead.businessIndustry} />
                                    <DetailBox label="Purpose" value={lead.purpose.replace('_', ' ')} />
                                </div>
                            </div>

                            {/* Expanded Notes Section */}
                            {expandedLead === lead.id && (
                                <div className="border-t border-border bg-surfaceHighlight/30 p-5 rounded-b-xl space-y-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <MessageSquarePlus className="w-4 h-4 text-primary" />
                                        <h4 className="text-sm font-bold text-textPrimary">Internal Notes</h4>
                                    </div>

                                    <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                                        {lead.notes?.length ? lead.notes.map((note, idx) => (
                                            <div key={idx} className="bg-white p-3 rounded-lg border border-border text-sm shadow-sm">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="font-bold text-primary text-[10px]">{note.authorName}</span>
                                                    <span className="text-[10px] text-textSecondary">{note.createdAt?.toDate().toLocaleString()}</span>
                                                </div>
                                                <p className="text-textPrimary leading-relaxed">{note.text}</p>
                                            </div>
                                        )) : (
                                            <p className="text-xs text-textSecondary italic py-2 text-center">No internal notes yet.</p>
                                        )}
                                    </div>

                                    <div className="flex gap-2 bg-white p-1 rounded-lg border border-border focus-within:ring-1 focus-within:ring-primary shadow-sm">
                                        <input
                                            type="text"
                                            placeholder="Write a note..."
                                            value={noteText[lead.id] || ''}
                                            onChange={(e) => setNoteText(prev => ({ ...prev, [lead.id]: e.target.value }))}
                                            onKeyDown={(e) => e.key === 'Enter' && handleAddNote(lead.id)}
                                            className="flex-1 bg-transparent px-3 py-1.5 text-sm outline-none"
                                        />
                                        <button
                                            onClick={() => handleAddNote(lead.id)}
                                            disabled={!noteText[lead.id]?.trim()}
                                            className="bg-primary text-white px-4 py-1.5 rounded-md text-xs font-bold disabled:opacity-50 transition-opacity"
                                        >
                                            Add
                                        </button>
                                    </div>

                                    <div className="pt-2 flex flex-wrap gap-2">
                                        <button
                                            onClick={() => handleStatusUpdate(lead.id, 'reviewing')}
                                            className="px-3 py-1.5 bg-yellow-50 text-yellow-700 text-[10px] font-bold rounded-md hover:bg-yellow-100 uppercase tracking-wider"
                                        >
                                            Mark Reviewing
                                        </button>
                                        <button
                                            onClick={() => handleStatusUpdate(lead.id, 'contacted')}
                                            className="px-3 py-1.5 bg-purple-50 text-purple-700 text-[10px] font-bold rounded-md hover:bg-purple-100 uppercase tracking-wider"
                                        >
                                            Mark Contacted
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function StatCard({ label, value, color }: { label: string, value: number, color: string }) {
    return (
        <div className="bg-white p-4 rounded-xl border border-border shadow-sm flex flex-col items-center text-center">
            <p className="text-[10px] text-textSecondary font-black uppercase mb-1 tracking-widest">{label}</p>
            <p className={`text-3xl font-black ${color}`}>{value}</p>
        </div>
    );
}

function DetailBox({ label, value, highlight }: { label: string, value: string, highlight?: boolean }) {
    return (
        <div className={`p-3 rounded-lg border transition-colors ${highlight ? 'bg-green-50/50 border-green-200 shadow-sm' : 'bg-surfaceHighlight/50 border-border/50'}`}>
            <p className="text-[10px] text-textSecondary font-bold uppercase mb-1 tracking-tight">{label}</p>
            <p className={`text-[13px] font-black ${highlight ? 'text-green-700' : 'text-textPrimary'} capitalize truncate`}>{value}</p>
        </div>
    );
}
