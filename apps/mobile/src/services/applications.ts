import {
    collection,
    doc,
    setDoc,
    getDocs,
    query,
    where,
    Timestamp,
    limit,
    orderBy
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { Application, ApplicationType } from '../types';
import { cacheService } from './cache';
import { syncService, SyncJob } from './sync';

export const APPLICATION_CACHE_KEY_PREFIX = 'cache_application_';
const buildCacheKey = (userId: string) => `${APPLICATION_CACHE_KEY_PREFIX}${userId}`;

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
        const appsCol = collection(db, 'applications');
        // Get the most recent application for the user
        const q = query(
            appsCol,
            where('userId', '==', userId),
            orderBy('createdAt', 'desc'),
            limit(1)
        );
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            const appData = { id: doc.id, version: 1, ...doc.data() } as Application;
            // Update cache
            await cacheService.set(cacheKey, appData);
            return appData;
        }
        return null;
    } catch (error) {
        console.error("Error fetching application:", error);
        return null;
    }
};

const queueOfflineWrite = async (job: Omit<SyncJob, 'id' | 'timestamp'>) => {
    console.warn('Queueing offline write', { collection: job.collection, docId: job.docId, merge: job.merge });
    await syncService.queueWrite(job);
};

export const saveApplication = async (id: string, data: Partial<Application>): Promise<void> => {
    try {
        const appDoc = doc(db, 'applications', id);
        const updatedData = {
            ...data,
            version: typeof data.version === 'number' ? data.version : 1,
            lastUpdated: Timestamp.now()
        };

        // 1. Update Firestore
        await setDoc(appDoc, updatedData, { merge: true });

        // 2. Update Cache (we need the full object for cache, but we might only have partial here)
        // Strategy: Fetch current cache, merge, and save back.
        // Since we don't have userId easily here, we might need to pass it or store it.
        // For simplicity, we'll assume the UI passes enough data or we re-fetch if needed.
        // BETTER: The UI usually holds the full 'application' state. 
        // Let's rely on the UI to update the local state, but we should try to update the cache if possible.
        // Actually, let's just invalidate the cache or update it if we can.

        // To properly update cache, we need the userId to form the key. 
        // If 'data' has userId, great. If not, we might miss updating the cache key correctly.
        // Let's assume the calling component manages the 'application' state and we can just update the cache 
        // from the UI side if we wanted to be 100% sync, OR we just accept that saveApplication writes to DB.

        // However, to fix the "loading hell", `getApplication` needs to find data.
        // If we save to DB but don't update cache, the next `getApplication` might still return old cache 
        // (if we didn't invalidate) or hit DB if cache expired.

        // Let's update the cache if we have the userId.
        if (data.userId) {
            const cacheKey = buildCacheKey(data.userId);
            // We need to merge with existing cache to be safe
            const existing = await cacheService.get<Application>(cacheKey);
            if (existing) {
                await cacheService.set(cacheKey, { ...existing, ...updatedData });
            }
        }

    } catch (error) {
        console.error("Error saving application:", error);
        if (data.userId) {
            await queueOfflineWrite({
                collection: 'applications',
                docId: id,
                payload: {
                    ...data,
                    version: typeof data.version === 'number' ? data.version : 1,
                    lastUpdated: Timestamp.now()
                },
                merge: true,
            });
        }
        throw error;
    }
};

export const createApplication = async (userId: string, type: ApplicationType): Promise<Application> => {
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

    try {
        const appDoc = doc(db, 'applications', newApp.id);
        await setDoc(appDoc, newApp);

        // Update Cache
        await cacheApplicationSnapshot(newApp);

        return newApp;
    } catch (error) {
        console.error("Error creating application:", error);
        await queueOfflineWrite({
            collection: 'applications',
            docId: newApp.id,
            payload: newApp,
            merge: false,
        });
        // Return the local draft so UI can proceed offline; queued write will sync later.
        return newApp;
    }
};

export const submitApplication = async (application: Application): Promise<void> => {
    try {
        const updates: Partial<Application> = { status: 'submitted', lastUpdated: Timestamp.now() };
        await saveApplication(application.id, { ...application, ...updates });

        // Update Cache
        await cacheApplicationSnapshot({ ...application, ...updates });
    } catch (error) {
        console.error("Error submitting application:", error);
        throw error;
    }
};

export const getUserApplications = async (userId: string): Promise<Application[]> => {
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

export const flushPendingApplicationWrites = async (): Promise<void> => {
    await syncService.flushQueue(async (job) => {
        if (job.collection !== 'applications') return;
        const appDoc = doc(db, job.collection, job.docId);
        await setDoc(appDoc, job.payload, { merge: job.merge !== false });
        if (job.payload.userId) {
            const cacheKey = buildCacheKey(job.payload.userId);
            await cacheService.set(cacheKey, job.payload as Application);
        }
    });
};
