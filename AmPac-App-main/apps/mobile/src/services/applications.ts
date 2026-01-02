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
    const cacheKey = buildCacheKey(userId);

    // 1. Try cache first
    const cached = await cacheService.get<Application>(cacheKey);
    if (cached) {
        console.log('[Applications] Returning cached application');
        return cached;
    }

    // 2. Try Firestore
    if (!auth.currentUser) {
        console.log('[Applications] User not authenticated');
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

    // Cache locally for offline support
    if (data.userId) {
        const cacheKey = buildCacheKey(data.userId);
        const existing = await cacheService.get<Application>(cacheKey);
        const merged = { ...existing, ...updatedData } as Application;
        await cacheService.set(cacheKey, merged);
    }

    // Save to Firestore
    try {
        const appDoc = doc(db, 'applications', id);
        await setDoc(appDoc, updatedData, { merge: true });
        console.log('[Applications] Saved to Firestore');
    } catch (error) {
        console.error("Firestore save failed:", error);
        throw error;
    }
};

export const createApplication = async (userId: string, type: ApplicationType): Promise<Application> => {
    if (!auth.currentUser) {
        throw new Error('User must be authenticated to create an application');
    }

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
        await cacheApplicationSnapshot(newApp);
        console.log('[Applications] Created in Firestore:', newApp.id);
    } catch (error) {
        console.error("Firestore create failed:", error);
        throw error;
    }

    return newApp;
};

export const submitApplication = async (application: Application): Promise<void> => {
    const updates: Partial<Application> = {
        status: 'submitted',
        lastUpdated: Timestamp.now()
    };

    await saveApplication(application.id, { ...application, ...updates });
    await cacheApplicationSnapshot({ ...application, ...updates });
    console.log('[Applications] Application submitted:', application.id);
};

export const getUserApplications = async (userId: string): Promise<Application[]> => {
    if (!auth.currentUser) {
        return [];
    }

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
    if (!auth.currentUser) {
        setTimeout(() => onUpdate([]), 0);
        return () => {};
    }

    const appsCol = collection(db, 'applications');
    const q = query(
        appsCol,
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
        const apps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Application));
        onUpdate(apps);

        // Also update cache for offline support
        if (apps.length > 0) {
            cacheApplicationSnapshot(apps[0]);
        }
    }, (error) => {
        console.error("Error subscribing to applications:", error);
        onUpdate([]);
    });
};
