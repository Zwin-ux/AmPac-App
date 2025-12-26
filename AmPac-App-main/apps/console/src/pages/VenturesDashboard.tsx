import { useState, useEffect } from 'react';
import { Activity, AlertTriangle, CheckCircle, Clock, RefreshCw, Search, Link, AlertCircle } from 'lucide-react';
import { venturesService } from '../services/venturesService';
import VenturesConnectionModal from '../components/ventures/VenturesConnectionModal';
import { ConnectM365Button } from '../components/ConnectM365Button';
import { M365Widgets } from '../components/dashboard/DashboardWidgets';
import type { VenturesDashboardStats, VenturesDashboardLog } from '../types';

export default function VenturesDashboard() {
    const [stats, setStats] = useState<VenturesDashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'error' | 'pending' | 'dlq'>('all');
    const [isConnected, setIsConnected] = useState(false);
    const [config, setConfig] = useState<{ username?: string, site_name?: string }>({});
    const [isModalOpen, setIsModalOpen] = useState(false);

    const loadData = async () => {
        try {
        const [statsData, configData] = await Promise.all([
            venturesService.getDashboardStats(),
            venturesService.getConfigStatus()
        ]);
        setStats(statsData);
        setIsConnected(configData.configured);
        setConfig(configData);
    } catch (err) {
        console.error(err);
    } finally {
        setLoading(false);
    }
};

    useEffect(() => {
        loadData();
    }, []);

    const filteredLogs = (stats?.recentLogs || []).filter((log) => {
        if (filter === 'error') return log.status === 'error' || log.status === 'dead_letter';
        if (filter === 'pending') return log.status === 'pending';
        if (filter === 'dlq') return log.status === 'dead_letter';
        return true;
    });

    if (loading) return <div className="p-8 text-center">Loading Dashboard...</div>;

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <VenturesConnectionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={() => {
                    loadData();
                    setIsModalOpen(false);
                }}
            />

            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-text">Ventures Command Center</h1>
                    <p className="text-textSecondary">Operational overview of LOS integration</p>
                </div>
                <div className="flex gap-2">
                    <ConnectM365Button />
                    {!isConnected ? (
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 flex items-center gap-2 shadow-sm"
                        >
                            <Link className="w-4 h-4" /> Connect Ventures
                        </button>
                    ) : (
                        <div className="px-4 py-2 bg-green-50 text-green-700 border border-green-200 rounded text-sm font-medium flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" /> Connected as {config.username}
                        </div>
                    )}
                    <button
                        onClick={loadData}
                        className="px-4 py-2 bg-white border border-border rounded text-sm font-medium hover:bg-gray-50 flex items-center gap-2"
                    >
                        <RefreshCw className="w-4 h-4" /> Refresh
                    </button>
                </div>
            </div>

            {/* M365 Widgets */}
            <div className="mb-8">
                <M365Widgets />
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-surface p-6 rounded-lg border border-border shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-medium text-textSecondary">Synced Loans</h3>
                        <div className="bg-green-100 p-2 rounded-full">
                            <CheckCircle className="w-5 h-5 text-success" />
                        </div>
                    </div>
                    <div className="text-3xl font-bold text-text">{stats?.syncedCount ?? 0}</div>
                    <div className="text-sm text-success mt-1">Live from Brain</div>
                </div>

                <div className="bg-surface p-6 rounded-lg border border-border shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-medium text-textSecondary">Pending Sync</h3>
                        <div className="bg-blue-100 p-2 rounded-full">
                            <Clock className="w-5 h-5 text-blue-600" />
                        </div>
                    </div>
                    <div className="text-3xl font-bold text-text">{stats?.pendingCount ?? 0}</div>
                    <div className="text-sm text-textSecondary mt-1">
                        Queue: {stats?.queueDepth?.pending ?? 0} pending / {stats?.queueDepth?.in_flight ?? 0} in-flight
                    </div>
                </div>

                <div className="bg-surface p-6 rounded-lg border border-border shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-medium text-textSecondary">Sync Errors</h3>
                        <div className="bg-red-100 p-2 rounded-full">
                            <AlertTriangle className="w-5 h-5 text-error" />
                        </div>
                    </div>
                    <div className="text-3xl font-bold text-text">{stats?.errorCount ?? 0}</div>
                    <div className="text-sm text-error mt-1">
                        DLQ: {stats?.queueDepth?.dead_letter ?? 0}
                    </div>
                </div>
            </div>

            {stats?.stale && (
                <div className="mb-6 px-4 py-3 rounded-md border border-yellow-300 bg-yellow-50 text-yellow-800 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Sync loop is stale; check Brain health.
                </div>
            )}

            {/* Operational View */}
            <div className="bg-surface rounded-lg border border-border shadow-sm">
                <div className="p-4 border-b border-border flex items-center justify-between">
                    <h2 className="font-bold text-text flex items-center gap-2">
                        <Activity className="w-5 h-5" />
                        Global Sync Activity
                    </h2>
                    <div className="flex gap-2">
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search Loan ID..."
                                className="pl-9 pr-4 py-1.5 border border-border rounded text-sm focus:ring-2 focus:ring-primary outline-none"
                            />
                        </div>
                        <select
                            aria-label="Filter events"
                            className="border border-border rounded px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value as any)}
                        >
                            <option value="all">All Events</option>
                            <option value="error">Errors Only</option>
                            <option value="pending">Pending</option>
                            <option value="dlq">Dead Letter</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-textSecondary font-medium border-b border-border">
                            <tr>
                                <th className="px-6 py-3">Timestamp</th>
                                <th className="px-6 py-3">Loan ID</th>
                                <th className="px-6 py-3">Mode</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3">Summary</th>
                                <th className="px-6 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredLogs.map((log: VenturesDashboardLog, idx: number) => (
                                <tr key={log.id || idx} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 text-textSecondary">
                                        {log.timestamp
                                            ? new Date(log.timestamp).toLocaleString()
                                            : log.updatedAt
                                                ? new Date(log.updatedAt).toLocaleString()
                                                : '—'}
                                    </td>
                                    <td className="px-6 py-4 font-medium text-primary">
                                        {log.loanApplicationId || '—'}
                                    </td>
                                    <td className="px-6 py-4 capitalize">
                                        <span className="px-2 py-1 rounded bg-gray-100 text-xs font-medium">
                                            {log.type?.replace('_', ' ') || 'Unknown'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${log.status === 'success' ? 'bg-green-100 text-green-800' :
                                            log.status === 'pending' ? 'bg-blue-100 text-blue-800' :
                                                log.status === 'info' ? 'bg-gray-100 text-gray-700' :
                                                    log.status === 'dead_letter' ? 'bg-red-200 text-red-900' :
                                                        'bg-red-100 text-red-800'
                                            }`}>
                                            {log.status === 'success' && <CheckCircle className="w-3 h-3" />}
                                            {log.status !== 'success' && <AlertTriangle className="w-3 h-3" />}
                                            {log.status?.replace('_', ' ') || 'Unknown'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-textSecondary max-w-xs truncate">
                                        {log.message}
                                    </td>
                                    <td className="px-6 py-4">
                                        {log.status === 'dead_letter' && log.id ? (
                                            <button
                                                className="text-primary hover:text-primaryLight font-medium text-xs"
                                                onClick={async () => {
                                                    try {
                                                        await venturesService.replayEvent(log.id!);
                                                        loadData();
                                                    } catch (err) {
                                                        console.error(err);
                                                        alert('Replay failed');
                                                    }
                                                }}
                                            >
                                                Replay
                                            </button>
                                        ) : (
                                            <button className="text-primary hover:text-primaryLight font-medium text-xs">
                                                View Details
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
