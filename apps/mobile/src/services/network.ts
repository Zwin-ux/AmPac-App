import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { Business } from '../types';
import { cacheService } from './cache';

let businessCache: Business[] | null = null;

const CACHE_KEY_BUSINESSES = 'cache_businesses';

export const getBusinesses = async (forceRefresh = false): Promise<Business[]> => {
    if (businessCache && !forceRefresh) {
        return businessCache;
    }

    if (!forceRefresh) {
        const cached = await cacheService.get<Business[]>(CACHE_KEY_BUSINESSES);
        if (cached) {
            businessCache = cached;
            return cached;
        }
    }

    try {
        const businessesRef = collection(db, 'businesses');
        // const q = query(usersRef, where('role', '==', 'entrepreneur')); // OLD: caused permission error
        const q = query(businessesRef); // Query businesses directly
        const querySnapshot = await getDocs(q);

        const fetchedBusinesses: Business[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            // Support both 'name' (new) and 'businessName' (legacy)
            const name = data.name || data.businessName;
            if (name) {
                fetchedBusinesses.push({
                    id: doc.id,
                    ownerId: data.ownerId || doc.id,
                    name: name,
                    industry: data.industry || 'General',
                    description: data.description || data.bio || 'No description available.',
                    city: data.city || 'Inland Empire',
                    ownerName: data.ownerName || data.fullName || 'AmPac Member',
                    members: data.members || {},
                });
            }
        });

        businessCache = fetchedBusinesses;

        await cacheService.set(CACHE_KEY_BUSINESSES, businessCache);
        return businessCache ?? [];
    } catch (error) {
        console.error("Error fetching businesses:", error);
        return [];
    }
};
