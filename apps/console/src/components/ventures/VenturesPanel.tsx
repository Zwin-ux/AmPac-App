import { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, ArrowRight, Lock, FileText, Activity } from 'lucide-react';
import { venturesService } from '../../services/venturesService';
import type { VenturesLoanStatus, SyncMode } from '../../types';

interface VenturesPanelProps {
    loanId: string;
}

export default function VenturesPanel({ loanId }: VenturesPanelProps) {
    const [status, setStatus] = useState<VenturesLoanStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [note, setNote] = useState('');
    const [selectedMode, setSelectedMode] = useState<SyncMode>('dry_run');

    const loadStatus = async () => {
        setLoading(true);
        try {
            const data = await venturesService.getLoanStatus(loanId);
            setStatus(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadStatus();
    }, [loanId]);

    const handleSync = async () => {
        setSyncing(true);
        try {
            await venturesService.syncLoan(loanId, selectedMode, note);
            setNote('');
            await loadStatus(); // Refresh logs
        } catch (err) {
            console.error(err);
        } finally {
            setSyncing(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-textSecondary">Loading Ventures data...</div>;
    if (!status) return <div className="p-8 text-center text-error">Failed to load Ventures data</div>;

    const matchCount = status.fieldMappings.filter(f => f.status === 'match').length;
    const mismatchCount = status.fieldMappings.filter(f => f.status === 'mismatch').length;

    return (
        <div className="bg-surface rounded-lg border border-border overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-border bg-surfaceHighlight flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-100 p-2 rounded-full">
                        <RefreshCw className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <h3 className="font-bold text-text">Ventures Integration</h3>
                        <div className="flex items-center gap-2 text-xs text-textSecondary">
                            <span className={`w-2 h-2 rounded-full ${status.status === 'connected' ? 'bg-success' : 'bg-error'}`} />
                            {status.status === 'connected' ? `Connected (ID: ${status.venturesLoanId})` : 'Disconnected'}
                            <span>•</span>
                            <span>Last Sync: {new Date(status.lastSync).toLocaleString()}</span>
                        </div>
                    </div>
                </div>
                <div className="flex gap-4 text-sm">
                    <div className="text-center">
                        <div className="font-bold text-success">{matchCount}</div>
                        <div className="text-textSecondary text-xs">Matched</div>
                    </div>
                    <div className="text-center">
                        <div className="font-bold text-warning">{mismatchCount}</div>
                        <div className="text-textSecondary text-xs">Mismatched</div>
                    </div>
                </div>
            </div>

            {/* Field Mappings */}
            <div className="p-4">
                <h4 className="text-sm font-bold text-text mb-3 uppercase tracking-wider">Data Contract</h4>
                <div className="space-y-2">
                    {status.fieldMappings.map((field) => (
                        <div key={field.field} className="flex items-center justify-between p-3 bg-gray-50 rounded border border-border text-sm">
                            <div className="flex-1">
                                <div className="font-medium text-textSecondary flex items-center gap-2">
                                    {field.field}
                                    {field.isLocked && <Lock className="w-3 h-3 text-gray-400" />}
                                </div>
                                <div className="font-bold text-text mt-1">{field.ampacValue}</div>
                                <div className="text-xs text-blue-600 mt-0.5">Source: AmPac</div>
                            </div>

                            <div className="px-4">
                                {field.status === 'match' ? (
                                    <CheckCircle className="w-5 h-5 text-success" />
                                ) : (
                                    <ArrowRight className="w-5 h-5 text-warning" />
                                )}
                            </div>

                            <div className="flex-1 text-right">
                                <div className="font-medium text-textSecondary">Ventures</div>
                                <div className={`font-bold mt-1 ${field.status === 'mismatch' ? 'text-warning' : 'text-text'}`}>
                                    {field.venturesValue}
                                </div>
                                <div className="text-xs text-gray-500 mt-0.5">
                                    {field.sourceOfTruth === 'ventures' ? 'Source: Ventures (Read Only)' : 'Target'}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Sync Controls */}
            <div className="p-4 border-t border-border bg-gray-50">
                <h4 className="text-sm font-bold text-text mb-3 uppercase tracking-wider">Sync Operations</h4>

                <div className="flex gap-2 mb-4">
                    {(['dry_run', 'validate', 'commit'] as SyncMode[]).map((mode) => (
                        <button
                            key={mode}
                            onClick={() => setSelectedMode(mode)}
                            className={`flex-1 py-2 px-4 rounded border text-sm font-medium transition-colors capitalize ${selectedMode === mode
                                    ? 'bg-primary text-white border-primary'
                                    : 'bg-white text-textSecondary border-border hover:bg-gray-100'
                                }`}
                        >
                            {mode.replace('_', ' ')}
                        </button>
                    ))}
                </div>

                <div className="mb-4">
                    <input
                        type="text"
                        placeholder="Add a note (e.g., 'Overrode income due to add-back')..."
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        className="w-full p-2 border border-border rounded text-sm focus:ring-2 focus:ring-primary outline-none"
                    />
                </div>

                <button
                    onClick={handleSync}
                    disabled={syncing}
                    className="w-full bg-primary text-white py-2 rounded font-bold hover:bg-primaryLight transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
                >
                    {syncing && <RefreshCw className="w-4 h-4 animate-spin" />}
                    {selectedMode === 'dry_run' ? 'Run Simulation' : selectedMode === 'validate' ? 'Validate Data' : 'Push to Ventures'}
                </button>
            </div>

            {/* Activity Log */}
            <div className="p-4 border-t border-border">
                <h4 className="text-sm font-bold text-text mb-3 uppercase tracking-wider flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Recent Activity
                </h4>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                    {status.syncLogs.length === 0 && <div className="text-sm text-textSecondary italic">No activity yet.</div>}
                    {status.syncLogs.map((log) => (
                        <div key={log.id} className="text-sm border-l-2 border-gray-200 pl-3 py-1">
                            <div className="flex justify-between items-start">
                                <span className="font-medium capitalize text-text">{log.mode.replace('_', ' ')}</span>
                                <span className="text-xs text-textSecondary">{new Date(log.timestamp).toLocaleTimeString()}</span>
                            </div>
                            <div className={`text-xs mt-1 ${log.status === 'success' ? 'text-success' :
                                    log.status === 'validation_error' ? 'text-warning' : 'text-error'
                                }`}>
                                {log.summary}
                            </div>
                            {log.note && (
                                <div className="mt-1 text-xs bg-yellow-50 text-yellow-800 p-1 rounded border border-yellow-100 flex items-center gap-1">
                                    <FileText className="w-3 h-3" /> {log.note}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
