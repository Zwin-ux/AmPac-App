import { API_URL } from '../config';

export type OpsOverview = {
    uptimePercent: number;
    openAlerts: number;
    lastIncident?: string;
    metrics: {
        bookingsToday: number;
        activePlans: number;
        activeMembers: number;
    };
};

export type FeatureFlag = {
    key: string;
    label: string;
    enabled: boolean;
    description?: string;
};

const baseApi = API_URL.replace(/\/api\/v1$/, '');

const mockOverview: OpsOverview = {
    uptimePercent: 99.9,
    openAlerts: 0,
    lastIncident: 'None in the last 7 days',
    metrics: {
        bookingsToday: 12,
        activePlans: 48,
        activeMembers: 132,
    },
};

const mockFlags: FeatureFlag[] = [
    { key: 'graphEnabled', label: 'Graph / Bookings', enabled: true },
    { key: 'venturesEnabled', label: 'Ventures Sync', enabled: true },
    { key: 'sharefileEnabled', label: 'ShareFile Uploads', enabled: true },
    { key: 'bookingsEnabled', label: 'Borrower Bookings UI', enabled: true },
    { key: 'consoleDashboardLive', label: 'Console Live Metrics', enabled: false },
];

export async function fetchOpsOverview(): Promise<OpsOverview> {
    try {
        const resp = await fetch(`${baseApi}/api/v1/admin/ops/overview`, {
            method: 'GET',
            credentials: 'include',
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        return await resp.json();
    } catch (err) {
        console.warn('opsService.fetchOpsOverview: falling back to mock data', err);
        return mockOverview;
    }
}

export async function fetchFlags(): Promise<FeatureFlag[]> {
    try {
        const resp = await fetch(`${baseApi}/api/v1/admin/flags`, {
            method: 'GET',
            credentials: 'include',
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        return await resp.json();
    } catch (err) {
        console.warn('opsService.fetchFlags: falling back to mock flags', err);
        return mockFlags;
    }
}

export async function updateFlag(key: string, enabled: boolean): Promise<FeatureFlag> {
    const payload = { key, enabled };
    const resp = await fetch(`${baseApi}/api/v1/admin/flags/${encodeURIComponent(key)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
    });
    if (!resp.ok) {
        throw new Error(`Failed to update flag ${key}: ${resp.status}`);
    }
    return await resp.json();
}
