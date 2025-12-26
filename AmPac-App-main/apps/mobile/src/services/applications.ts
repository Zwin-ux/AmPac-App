import {
    collection,
    doc,
    setDoc,
    getDocs,
    query,
    where,
    Timestamp,
    limit,
    orderBy,
    onSnapshot,
    Unsubscribe
} from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import { Application, ApplicationType } from '../types';
import { cacheService } from './cache';
import { API_URL } from '../config';
import { getFirebaseIdToken } from './brainAuth';
import { getApiHeaders } from './assistantService';

export const APPLICATION_CACHE_KEY_PREFIX = 'cache_application_';
const buildCacheKey = (userId: string) => `${APPLICATION_CACHE_KEY_PREFIX}${userId}`;

// For demo: Store applications locally if Firestore fails
const LOCAL_APPS_KEY = 'local_applications';

const getLocalApplications = async (): Promise<Application[]> => {
    try {
        const stored = await cacheService.get<Application[]>(LOCAL_APPS_KEY, Infinity);
        return stored || [];
    } catch {
        return [];
    }
};

const saveLocalApplication = async (app: Application): Promise<void> => {
    const apps = await getLocalApplications();
    const existing = apps.findIndex(a => a.id === app.id);
    if (existing >= 0) {
        apps[existing] = app;
    } else {
        apps.push(app);
    }
    await cacheService.set(LOCAL_APPS_KEY, apps);
};

export const cacheApplicationSnapshot = async (application: Application): Promise<void> => {
    try {
        if (!application.userId) return;
        await cacheService.set(buildCacheKey(application.userId), application);
        // Also save to local storage for demo reliability
        await saveLocalApplication(application);
    } catch (error) {
        console.error("Error caching application snapshot:", error);
    }
};

export const getApplication = async (userId: string): Promise<Application | null> => {
    const cacheKey = buildCacheKey(userId);

    // 1. Try cache first
    const cached = await cacheService.get<Application>(cacheKey);
    if (cached) {
        console.log('[Applications] Returning cached application');
        return cached;
    }

    // 2. Try local storage (for demo reliability)
    const localApps = await getLocalApplications();
    const localApp = localApps.find(a => a.userId === userId);
    if (localApp) {
        console.log('[Applications] Returning local application');
        await cacheService.set(cacheKey, localApp);
        return localApp;
    }

    // 3. Try Firestore
    // In development: avoid running Firestore queries for the legacy 'dev-user' when no auth is present
    if (__DEV__ && userId === 'dev-user' && !auth.currentUser) {
        console.log('[Applications] Skipping Firestore query for dev-user in dev mode');
        return null;
    }
    try {
        const appsCol = collection(db, 'applications');
        const q = query(
            appsCol,
            where('userId', '==', userId),
            orderBy('createdAt', 'desc'),
            limit(1)
        );
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            const docData = snapshot.docs[0];
            const appData = { id: docData.id, version: 1, ...docData.data() } as Application;
            await cacheService.set(cacheKey, appData);
            await saveLocalApplication(appData);
            console.log('[Applications] Returning Firestore application');
            return appData;
        }
        return null;
    } catch (error) {
        console.error("Error fetching application from Firestore:", error);
        return null;
    }
};

export const saveApplication = async (id: string, data: Partial<Application>): Promise<void> => {
    const updatedData = {
        ...data,
        version: typeof data.version === 'number' ? data.version : 1,
        lastUpdated: Timestamp.now()
    };

    // Always save locally first (for demo reliability)
    if (data.userId) {
        const cacheKey = buildCacheKey(data.userId);
        const existing = await cacheService.get<Application>(cacheKey);
        const merged = { ...existing, ...updatedData } as Application;
        await cacheService.set(cacheKey, merged);
        await saveLocalApplication(merged);
        console.log('[Applications] Saved locally');
    }

    // Try to save to Firestore (non-blocking for demo)
    try {
        const appDoc = doc(db, 'applications', id);
        await setDoc(appDoc, updatedData, { merge: true });
        console.log('[Applications] Saved to Firestore');
    } catch (error) {
        console.warn("Firestore save failed, data saved locally:", error);
        // Don't throw - data is safe locally
    }
};

export const createApplication = async (userId: string, type: ApplicationType): Promise<Application> => {
    // 1. Try to create via backend API first
    try {
        const headers = await getApiHeaders();
        const response = await fetch(`${API_URL}/applications/`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ type })
        });

        if (response.ok) {
            const remoteApp = await response.json();
            // Backend returns full app with documents initialized
            await cacheApplicationSnapshot(remoteApp);
            console.log('[Applications] Created via API:', remoteApp.id);
            return remoteApp;
        } else {
            const err = await response.text();
            console.warn('[Applications] API creation failed:', response.status, err);
        }
    } catch (error) {
        console.warn('[Applications] API creation error, falling back to local:', error);
    }

    // 2. Fallback to local creation (Original logic)
    const newApp: Application = {
        id: `app_${Date.now()}`,
        userId,
        type,
        status: 'draft',
        currentStep: 1,
        businessName: '',
        yearsInBusiness: 0,
        annualRevenue: 0,
        loanAmount: 0,
        useOfFunds: '',
        data: {},
        version: 1,
        createdAt: Timestamp.now(),
        lastUpdated: Timestamp.now(),
    };

    await cacheApplicationSnapshot(newApp);
    console.log('[Applications] Created locally (fallback):', newApp.id);

    try {
        const appDoc = doc(db, 'applications', newApp.id);
        await setDoc(appDoc, newApp);
        console.log('[Applications] Created in Firestore');
    } catch (error) {
        console.warn("Firestore create failed, app saved locally:", error);
    }

    return newApp;
};

export const submitApplication = async (application: Application): Promise<void> => {
    // 1. Try to submit via backend API
    try {
        const headers = await getApiHeaders();
        const response = await fetch(`${API_URL}/applications/${application.id}/submit`, {
            method: 'POST',
            headers
        });

        if (response.ok) {
            const updatedApp = await response.json();
            await cacheApplicationSnapshot(updatedApp);
            console.log('[Applications] Submitted via API:', application.id);
            return;
        }
    } catch (error) {
        console.warn('[Applications] API submission failed, falling back to direct update:', error);
    }

    // 2. Fallback to direct update
    const updates: Partial<Application> = {
        status: 'submitted',
        lastUpdated: Timestamp.now()
    };

    await saveApplication(application.id, { ...application, ...updates });
    await cacheApplicationSnapshot({ ...application, ...updates });
    console.log('[Applications] Application submitted (direct):', application.id);
};

export const getUserApplications = async (userId: string): Promise<Application[]> => {
    // Try local first
    const localApps = await getLocalApplications();
    const userApps = localApps.filter(a => a.userId === userId);
    if (userApps.length > 0) {
        return userApps;
    }

    // Try Firestore
    try {
        const appsCol = collection(db, 'applications');
        const q = query(appsCol, where('userId', '==', userId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Application));
    } catch (error) {
        console.error("Error fetching applications:", error);
        return [];
    }
};

export const subscribeToApplications = (userId: string, onUpdate: (apps: Application[]) => void): Unsubscribe => {
    const appsCol = collection(db, 'applications');
    const q = query(
        appsCol,
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
    );

    // If running in development against the demo 'dev-user' without an authenticated user, return empty results.
    if (__DEV__ && userId === 'dev-user' && !auth.currentUser) {
        setTimeout(() => onUpdate([]), 0);
        return () => {};
    }

    return onSnapshot(q, (snapshot) => {
        const apps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Application));
        onUpdate(apps);

        // Also update cache for offline support
        if (apps.length > 0) {
            cacheApplicationSnapshot(apps[0]);
        }
    }, (error) => {
        console.error("Error subscribing to applications:", error);
    });
};

export const flushPendingApplicationWrites = async (): Promise<void> => {
    // For demo: Try to sync local apps to Firestore
    try {
        const localApps = await getLocalApplications();
        for (const app of localApps) {
            try {
                const appDoc = doc(db, 'applications', app.id);
                await setDoc(appDoc, app, { merge: true });
            } catch {
                // Ignore individual failures
            }
        }
        console.log('[Applications] Flushed pending writes');
    } catch (error) {
        console.warn("Flush failed:", error);
    }
};
