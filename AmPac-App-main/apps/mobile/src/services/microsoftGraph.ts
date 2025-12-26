import * as AuthSession from 'expo-auth-session';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BookingItem, Room } from '../types';

type TokenCache = {
    accessToken: string;
    refreshToken?: string;
    expiresAt: number; // ms
};

const STORAGE_KEY = 'graph_token_cache_v1';
const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

const getConfig = () => {
    const extra = (Constants.expoConfig?.extra || {}) as any;
    const clientId = extra?.graphClientId || '';
    const tenantId = extra?.graphTenantId || 'common';
    const scopes: string[] = extra?.graphScopes || ['Calendars.ReadWrite', 'offline_access'];
    const useProxy = extra?.graphUseProxy ?? true;
    const scheme = extra?.scheme || Constants.expoConfig?.scheme || 'ampac';

    return { clientId, tenantId, scopes, useProxy, scheme };
};

const makeRedirectUri = (scheme: string) => AuthSession.makeRedirectUri({ scheme });
const isExpired = (expiresAt: number) => Date.now() > expiresAt - 60_000;

const loadCachedToken = async (): Promise<TokenCache | null> => {
    try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        return JSON.parse(raw) as TokenCache;
    } catch (e) {
        console.warn('Graph token cache read failed', e);
        return null;
    }
};

const saveToken = async (token: TokenCache) => {
    try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(token));
    } catch (e) {
        console.warn('Graph token cache write failed', e);
    }
};

const signOut = async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
};

const discover = async (tenantId: string) => {
    const url = `https://login.microsoftonline.com/${tenantId}/v2.0/.well-known/openid-configuration`;
    return AuthSession.fetchDiscoveryAsync(url);
};

const refreshIfPossible = async (cache: TokenCache, discovery: AuthSession.DiscoveryDocument, clientId: string, scopes: string[]) => {
    if (!cache.refreshToken) return null;
    try {
        const refreshed = await AuthSession.refreshAsync(
            {
                clientId,
                refreshToken: cache.refreshToken,
                scopes,
            },
            discovery
        );
        const next: TokenCache = {
            accessToken: refreshed.accessToken,
            refreshToken: refreshed.refreshToken ?? cache.refreshToken,
            expiresAt: Date.now() + (refreshed.expiresIn ?? 0) * 1000,
        };
        await saveToken(next);
        return next.accessToken;
    } catch (e) {
        console.warn('Graph token refresh failed', e);
        return null;
    }
};

const interactiveAuth = async () => {
    const { clientId, tenantId, scopes, useProxy, scheme } = getConfig();
    if (!clientId) {
        throw new Error('Missing Graph client id. Add graphClientId to app.json extra.');
    }

    const discovery = await discover(tenantId);
    const redirectUri = makeRedirectUri(scheme);

    const request = new AuthSession.AuthRequest({
        clientId,
        scopes,
        redirectUri,
        usePKCE: true,
        responseType: AuthSession.ResponseType.Code,
    });

    await request.makeAuthUrlAsync(discovery);
    const result = await request.promptAsync(discovery);
    if (result.type !== 'success' || !result.params.code) {
        throw new Error('Graph sign-in cancelled or failed');
    }

    const tokenResponse = await AuthSession.exchangeCodeAsync(
        {
            clientId,
            code: result.params.code,
            redirectUri,
            extraParams: {
                code_verifier: request.codeVerifier || '',
            },
        },
        discovery
    );

    const token: TokenCache = {
        accessToken: tokenResponse.accessToken,
        refreshToken: tokenResponse.refreshToken,
        expiresAt: Date.now() + (tokenResponse.expiresIn ?? 0) * 1000,
    };
    await saveToken(token);
    return token.accessToken;
};

const ensureAccessToken = async (): Promise<string | null> => {
    const { clientId, tenantId, scopes } = getConfig();
    const cached = await loadCachedToken();
    const discovery = await discover(tenantId);

    if (cached && !isExpired(cached.expiresAt)) {
        return cached.accessToken;
    }

    if (cached && isExpired(cached.expiresAt)) {
        const refreshed = await refreshIfPossible(cached, discovery, clientId, scopes);
        if (refreshed) return refreshed;
    }

    try {
        return await interactiveAuth();
    } catch (e) {
        console.warn('Graph interactive auth failed; falling back to stub event ids', e);
        return null;
    }
};

const toGraphDateTime = (timestamp?: any, timezone = 'UTC') => {
    if (!timestamp) return null;
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return {
        dateTime: date.toISOString(),
        timeZone: timezone,
    };
};

const createEventPayload = (item: BookingItem, room?: Room) => {
    const tz = room?.timezone || 'UTC';
    return {
        subject: `Reservation: ${room?.name || item.roomId}`,
        start: toGraphDateTime(item.startTime, tz),
        end: toGraphDateTime(item.endTime, tz),
        location: {
            displayName: room?.name,
        },
        isOnlineMeeting: false,
    };
};

export const graphCalendarService = {
    async ensureSignedIn() {
        return ensureAccessToken();
    },

    async signOut() {
        return signOut();
    },

    async createRoomEvent(item: BookingItem, room?: Room): Promise<string> {
        const { clientId } = getConfig();
        const token = await ensureAccessToken();
        const resourceId = room?.graphResourceId ?? room?.id ?? item.roomId;

        if (!token || !clientId) {
            const suffix = Math.floor(Math.random() * 1_000_000);
            return `graph-stub-${resourceId}-${suffix}`;
        }

        try {
            const payload = createEventPayload(item, room);
            const response = await fetch(`${GRAPH_BASE}/users/${resourceId}/events`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const body = await response.text();
                throw new Error(`Graph event creation failed: ${response.status} ${body}`);
            }

            const data = await response.json();
            return data.id ?? `graph-${resourceId}-unknown`;
        } catch (error) {
            console.warn('Graph event creation failed, using stub', error);
            const suffix = Math.floor(Math.random() * 1_000_000);
            return `graph-failed-${resourceId}-${suffix}`;
        }
    },

    async cancelEvent(graphEventId: string, resourceId?: string) {
        const token = await ensureAccessToken();
        if (!token || !resourceId) {
            return { cancelled: false, graphEventId, reason: 'No token or resource id' };
        }

        try {
            const response = await fetch(`${GRAPH_BASE}/users/${resourceId}/events/${graphEventId}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            if (!response.ok) {
                const body = await response.text();
                throw new Error(`Graph cancel failed: ${response.status} ${body}`);
            }
            return { cancelled: true, graphEventId };
        } catch (error) {
            console.warn('Graph cancel failed', error);
            return { cancelled: false, graphEventId, reason: 'Graph error' };
        }
    },

    async syncAvailabilitySnapshot(roomId: string) {
        const token = await ensureAccessToken();
        if (!token) return { roomId, refreshedAt: Date.now(), usedGraph: false };
        try {
            const response = await fetch(`${GRAPH_BASE}/users/${roomId}/calendar/calendarView?startDateTime=${new Date().toISOString()}&endDateTime=${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) throw new Error('Graph availability failed');
            return { roomId, refreshedAt: Date.now(), usedGraph: true };
        } catch (e) {
            console.warn('Graph availability sync failed', e);
            return { roomId, refreshedAt: Date.now(), usedGraph: false };
        }
    },

    async getUserProfile() {
        const token = await ensureAccessToken();
        if (!token) return null;

        try {
            const response = await fetch(`${GRAPH_BASE}/me`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) throw new Error('Failed to fetch profile');
            return await response.json();
        } catch (error) {
            console.warn('Graph profile fetch failed', error);
            return null;
        }
    },

    async checkConnectionStatus() {
        const cached = await loadCachedToken();
        if (cached && !isExpired(cached.expiresAt)) {
            return true;
        }
        // If expired but has refresh token, consider connected (will auto-refresh on use)
        if (cached && cached.refreshToken) {
            return true;
        }
        return false;
    }
};
