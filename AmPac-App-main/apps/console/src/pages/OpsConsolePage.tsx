import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Activity,
    Shield,
    ToggleLeft,
    ToggleRight,
    Wrench,
    Users,
    Building2,
    CreditCard,
    Headphones,
    Link2,
    RefreshCw,
    AlertTriangle,
    CheckCircle2,
    Clock,
    Megaphone,
} from 'lucide-react';
import { API_URL } from '../config';
import { fetchFlags, fetchOpsOverview, updateFlag, type FeatureFlag, type OpsOverview } from '../services/opsService';

type HealthStatus = 'ok' | 'warn' | 'fail';

type HealthCheck = {
    id: string;
    label: string;
    url: string;
    status: HealthStatus;
    detail?: string;
};

const HEALTH_ENDPOINTS = [
    { id: 'root', label: 'Process /health', url: '/health' },
    { id: 'api', label: 'API /api/v1/health', url: '/api/v1/health' },
    { id: 'deps', label: 'Dependencies', url: '/api/v1/health/deps' },
    { id: 'sync', label: 'Sync Loop', url: '/api/v1/health/sync' },
] as const;

const MODULES = [
    {
        title: 'Locations & Spaces',
        icon: Building2,
        path: '/admin',
        desc: 'Manage locations, rooms, capacity, and maintenance blocks.',
    },
    {
        title: 'Bookings & Calendar',
        icon: Activity,
        path: '/ventures',
        desc: 'Approve/modify bookings, check-ins, no-shows, buffers.',
    },
    {
        title: 'Members & Companies',
        icon: Users,
        path: '/admin',
        desc: 'People, companies, invites, access windows, visitor passes.',
    },
    {
        title: 'Plans & Billing',
        icon: CreditCard,
        path: '/payments',
        desc: 'Plans/credits, invoices, refunds, payouts, tax and dunning.',
    },
    {
        title: 'Support & Comms',
        icon: Headphones,
        path: '/teams',
        desc: 'Tickets/requests, SLA timers, announcements, canned replies.',
    },
    {
        title: 'Content & Links',
        icon: Link2,
        path: '/marketplace',
        desc: 'Curated links/cards for the “More” screen; reorder per site.',
    },
    {
        title: 'Community Feed',
        icon: Megaphone,
        path: '/community',
        desc: 'Moderate user posts and create official announcements.',
    },
] as const;

const FEATURE_FLAGS = [
    { key: 'graphEnabled', label: 'Graph / Bookings' },
    { key: 'venturesEnabled', label: 'Ventures Sync' },
    { key: 'sharefileEnabled', label: 'ShareFile Uploads' },
    { key: 'bookingsEnabled', label: 'Borrower Bookings UI' },
    { key: 'consoleDashboardLive', label: 'Console Live Metrics' },
] as const;

const getStatusIcon = (status: HealthStatus) => {
    if (status === 'ok') return <CheckCircle2 className="w-5 h-5 text-green-600" />;
    if (status === 'warn') return <AlertTriangle className="w-5 h-5 text-amber-500" />;
    return <AlertTriangle className="w-5 h-5 text-red-500" />;
};

export default function OpsConsolePage() {
    const navigate = useNavigate();
    const [checks, setChecks] = useState<HealthCheck[]>(
        HEALTH_ENDPOINTS.map((h) => ({ ...h, status: 'warn' as HealthStatus, detail: 'Not checked yet' }))
    );
    const [loading, setLoading] = useState(false);
    const [flags, setFlags] = useState<FeatureFlag[]>([]);
    const [savingFlag, setSavingFlag] = useState<Record<string, boolean>>({});
    const [flagError, setFlagError] = useState<string | null>(null);
    const [overview, setOverview] = useState<OpsOverview | null>(null);

    const baseApi = useMemo(() => API_URL.replace(/\/api\/v1$/, ''), []);

    const runChecks = async () => {
        setLoading(true);
        const results: HealthCheck[] = [];

        for (const h of HEALTH_ENDPOINTS) {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 8000);

            try {
                const resp = await fetch(`${baseApi}${h.url}`, { signal: controller.signal });
                const ok = resp.ok;
                const text = await resp.text();
                let parsed: any;
                try {
                    parsed = JSON.parse(text);
                } catch {
                    // leave parsed undefined; the plain text will be used
                }

                const status: HealthStatus = ok ? 'ok' : 'fail';
                results.push({
                    ...h,
                    status,
                    detail: parsed?.status || parsed?.message || text.slice(0, 200) || 'No response body',
                });
            } catch (err: any) {
                const status: HealthStatus = err?.name === 'AbortError' ? 'warn' : 'fail';
                results.push({
                    ...h,
                    status,
                    detail: err?.message || 'Request failed',
                });
            } finally {
                clearTimeout(timeout);
            }
        }

        setChecks(results);
        setLoading(false);
    };

    useEffect(() => {
        runChecks();
        fetchFlags().then(setFlags).catch((err) => {
            console.error('OpsConsole: fetchFlags failed', err);
        });
        fetchOpsOverview().then(setOverview).catch((err) => {
            console.error('OpsConsole: fetchOpsOverview failed', err);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const toggleFlag = async (flag: FeatureFlag) => {
        setFlagError(null);
        setSavingFlag((prev) => ({ ...prev, [flag.key]: true }));
        try {
            const updated = await updateFlag(flag.key, !flag.enabled);
            setFlags((prev) => prev.map((f) => (f.key === flag.key ? updated : f)));
        } catch (err: any) {
            console.error('OpsConsole: updateFlag failed', err);
            setFlagError(err?.message || 'Failed to update flag');
        } finally {
            setSavingFlag((prev) => ({ ...prev, [flag.key]: false }));
        }
    };

    return (
        <div className="p-6 space-y-6">
            <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                    <p className="text-xs uppercase tracking-wider text-textSecondary font-semibold">Control Center</p>
                    <h1 className="text-2xl font-bold text-primary mt-1">Ops Console</h1>
                    <p className="text-sm text-textSecondary mt-1">
                        Single pane for health, flags, and admin modules (Optix parity).
                    </p>
                </div>
                <button
                    onClick={runChecks}
                    disabled={loading}
                    className="inline-flex items-center px-3 py-2 rounded-md bg-primary text-white text-sm font-medium shadow-sm hover:bg-primaryLight disabled:opacity-60"
                >
                    {loading ? <Clock className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                    {loading ? 'Checking...' : 'Re-run health'}
                </button>
            </header>

            <section className="grid gap-4 lg:grid-cols-3">
                <div className="bg-surface border border-border rounded-lg shadow-subtle p-4">
                    <div className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-primary" />
                        <h2 className="font-semibold">Uptime</h2>
                    </div>
                    <p className="text-3xl font-bold mt-2">
                        {overview ? `${overview.uptimePercent.toFixed(2)}%` : '…'}
                    </p>
                    <p className="text-xs text-textSecondary mt-1">
                        {overview?.lastIncident || 'No recent incidents'}
                    </p>
                </div>

                <div className="bg-surface border border-border rounded-lg shadow-subtle p-4">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                        <h2 className="font-semibold">Open Alerts</h2>
                    </div>
                    <p className="text-3xl font-bold mt-2">
                        {overview ? overview.openAlerts : '…'}
                    </p>
                    <p className="text-xs text-textSecondary mt-1">Active alerts requiring action</p>
                </div>

                <div className="bg-surface border border-border rounded-lg shadow-subtle p-4">
                    <div className="flex items-center gap-2">
                        <Activity className="w-5 h-5 text-primary" />
                        <h2 className="font-semibold">Today</h2>
                    </div>
                    <div className="grid grid-cols-3 gap-3 mt-3 text-sm">
                        <MetricPill label="Bookings" value={overview?.metrics.bookingsToday} />
                        <MetricPill label="Plans" value={overview?.metrics.activePlans} />
                        <MetricPill label="Members" value={overview?.metrics.activeMembers} />
                    </div>
                </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
                <div className="bg-surface border border-border rounded-lg shadow-subtle p-4">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <Shield className="w-5 h-5 text-primary" />
                            <h2 className="font-semibold">Health Checks</h2>
                        </div>
                        <span className="text-xs text-textSecondary">
                            Base: {baseApi.replace(/^https?:\/\//, '')}
                        </span>
                    </div>
                    <div className="space-y-3">
                        {checks.map((c) => (
                            <div
                                key={c.id}
                                className="flex items-start justify-between rounded-md border border-border bg-surfaceHighlight p-3"
                            >
                                <div className="flex items-start gap-3">
                                    {getStatusIcon(c.status)}
                                    <div>
                                        <div className="font-semibold text-sm">{c.label}</div>
                                        <div className="text-xs text-textSecondary break-all">{c.detail}</div>
                                    </div>
                                </div>
                                <span className="text-[11px] text-textSecondary font-mono">{c.url}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-surface border border-border rounded-lg shadow-subtle p-4">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <Wrench className="w-5 h-5 text-primary" />
                            <h2 className="font-semibold">Feature Flags</h2>
                        </div>
                        <span className="text-xs text-textSecondary">Click to toggle (persists if API allows)</span>
                    </div>
                    {flagError && (
                        <div className="mb-2 text-xs text-red-600 border border-red-200 bg-red-50 px-3 py-2 rounded">
                            {flagError}
                        </div>
                    )}
                    <div className="grid sm:grid-cols-2 gap-3">
                        {(flags.length ? flags : FEATURE_FLAGS).map((f) => {
                            const enabled = (f as FeatureFlag).enabled ?? false;
                            const Icon = enabled ? ToggleRight : ToggleLeft;
                            const saving = savingFlag[f.key];
                            return (
                                <button
                                    key={f.key}
                                    onClick={() => toggleFlag(f as FeatureFlag)}
                                    disabled={saving}
                                    className="text-left p-3 border border-border rounded-md bg-surfaceHighlight hover:bg-surface transition-colors disabled:opacity-60"
                                >
                                    <div className="flex items-center gap-2">
                                        <Icon className={`w-5 h-5 ${enabled ? 'text-green-600' : 'text-textSecondary'}`} />
                                        <div className="font-semibold text-sm">{f.label}</div>
                                    </div>
                                    <div className="text-xs text-textSecondary mt-1">
                                        {enabled ? 'Enabled' : 'Disabled'}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </section>

            <section className="bg-surface border border-border rounded-lg shadow-subtle p-4">
                <div className="flex items-center gap-2 mb-4">
                    <LayoutModulesIcon />
                    <h2 className="font-semibold">Admin Modules (Optix parity targets)</h2>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {MODULES.map((m) => {
                        const Icon = m.icon;
                        const metric =
                            m.title.includes('Bookings') ? overview?.metrics.bookingsToday :
                                m.title.includes('Plans') ? overview?.metrics.activePlans :
                                    m.title.includes('Members') ? overview?.metrics.activeMembers : undefined;
                        return (
                            <button
                                key={m.title}
                                onClick={() => navigate(m.path)}
                                className="text-left h-full rounded-lg border border-border bg-surfaceHighlight hover:bg-surface transition-colors p-4 shadow-sm"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <Icon className="w-5 h-5 text-primary" />
                                        <div className="font-semibold">{m.title}</div>
                                    </div>
                                    {metric !== undefined && (
                                        <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                                            {metric}
                                        </span>
                                    )}
                                </div>
                                <div className="text-sm text-textSecondary">{m.desc}</div>
                            </button>
                        );
                    })}
                </div>
            </section>
        </div>
    );
}

function LayoutModulesIcon() {
    return (
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary">
            <Shield className="w-4 h-4" />
        </div>
    );
}

function MetricPill({ label, value }: { label: string; value?: number }) {
    return (
        <div className="rounded-md border border-border bg-surfaceHighlight px-3 py-2">
            <div className="text-xs text-textSecondary">{label}</div>
            <div className="text-lg font-semibold">{value ?? '—'}</div>
        </div>
    );
}
