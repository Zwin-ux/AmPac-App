import { Timestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { Application, ApplicationType } from '../types';
import { cacheService } from './cache';
import { API_URL } from '../config';

export const APPLICATION_CACHE_KEY_PREFIX = 'cache_application_';
const buildCacheKey = (userId: string) => `${APPLICATION_CACHE_KEY_PREFIX}${userId}`;

// Helper to convert API response (ISO strings) to Firestore Timestamps
const convertDatesToTimestamps = (data: any): any => {
    if (!data) return data;
    if (typeof data === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(data)) {
        return Timestamp.fromDate(new Date(data));
    }
    if (Array.isArray(data)) {
        return data.map(convertDatesToTimestamps);
    }
    if (typeof data === 'object') {
        const result: any = {};
        for (const key in data) {
            result[key] = convertDatesToTimestamps(data[key]);
        }
        return result;
    }
    return data;
};

const getAuthToken = async () => {
    const auth = getAuth();
    return auth.currentUser?.getIdToken();
};

export const cacheApplicationSnapshot = async (application: Application): Promise<void> => {
    try {
        if (!application.userId) return;
        await cacheService.set(buildCacheKey(application.userId), application);
    } catch (error) {
        console.error("Error caching application snapshot:", error);
    }
};

export const getApplication = async (userId: string): Promise<Application | null> => {
    if (!userId) {
        console.warn("getApplication called with no userId");
        return null;
    }
    const cacheKey = buildCacheKey(userId);

    // 1. Try cache first
    const cached = await cacheService.get<Application>(cacheKey);
    if (cached) {
        return cached;
    }

    try {
        const token = await getAuthToken();
        const url = `${API_URL}/applications/user/me`;
        console.log(`[Applications] Fetching from: ${url}`);

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'x-user-id': userId
            }
        });

        if (!response.ok) {
            if (response.status === 404) return null;
            throw new Error(`API Error: ${response.status}`);
        }

        const apps = await response.json();
        if (apps && apps.length > 0) {
            // Get most recent
            const appData = convertDatesToTimestamps(apps[0]) as Application;
            await cacheService.set(cacheKey, appData);
            return appData;
        }
        return null;
    } catch (error) {
        console.error("Error fetching application:", error);
        return null;
    }
};

export const saveApplication = async (id: string, data: Partial<Application>): Promise<void> => {
    try {
        const token = await getAuthToken();
        const response = await fetch(`${API_URL}/applications/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        // Update Cache
        if (data.userId) {
            const cacheKey = buildCacheKey(data.userId);
            const existing = await cacheService.get<Application>(cacheKey);
            if (existing) {
                await cacheService.set(cacheKey, { ...existing, ...data, lastUpdated: Timestamp.now() });
            }
        }

    } catch (error) {
        console.error("Error saving application:", error);
        // TODO: Queue offline write if needed, but for now we rely on API
        throw error;
    }
};

export const createApplication = async (userId: string, type: ApplicationType): Promise<Application> => {
    try {
        const token = await getAuthToken();
        const response = await fetch(`${API_URL}/applications/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                userId,
                type,
                // Default empty fields to satisfy schema if needed
                businessName: '',
                yearsInBusiness: 0,
                annualRevenue: 0,
                loanAmount: 0,
                useOfFunds: ''
            })
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const newApp = convertDatesToTimestamps(await response.json()) as Application;

        // Update Cache
        await cacheApplicationSnapshot(newApp);

        return newApp;
    } catch (error) {
        console.error("Error creating application:", error);
        throw error;
    }
};

export const submitApplication = async (application: Application): Promise<void> => {
    try {
        const token = await getAuthToken();
        const response = await fetch(`${API_URL}/applications/${application.id}/submit`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const updatedApp = convertDatesToTimestamps(await response.json()) as Application;

        // Update Cache
        await cacheApplicationSnapshot(updatedApp);
    } catch (error) {
        console.error("Error submitting application:", error);
        throw error;
    }
};

export const getUserApplications = async (userId: string): Promise<Application[]> => {
    try {
        const token = await getAuthToken();
        const response = await fetch(`${API_URL}/applications/user/me`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'x-user-id': userId
            }
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const apps = await response.json();
        return apps.map(convertDatesToTimestamps);
    } catch (error) {
        console.error("Error fetching applications:", error);
        return [];
    }
};

export const flushPendingApplicationWrites = async (): Promise<void> => {
    // No-op for now as we are API-first. 
    // In a real offline-first app, we'd replay the queue against the API.
    console.log("flushPendingApplicationWrites: Not implemented for API mode");
};

