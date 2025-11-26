import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { Business } from '../types';

let businessCache: Business[] | null = null;

import { cacheService } from './cache';

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
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('role', '==', 'entrepreneur'));
        const querySnapshot = await getDocs(q);

        const fetchedBusinesses: Business[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.businessName) {
                fetchedBusinesses.push({
                    id: doc.id,
                    name: data.businessName,
                    industry: data.industry || 'General',
                    description: data.description || 'No description available.',
                    city: data.city || 'Inland Empire',
                    ownerName: data.fullName
                });
            }
        });

        if (fetchedBusinesses.length === 0) {
            businessCache = [
                { id: '1', name: 'Inland Empire Coffee', industry: 'Food & Bev', description: 'Artisan coffee roaster.', city: 'Riverside', ownerName: 'Jane Doe' },
                { id: '2', name: 'Tech Solutions Inc.', industry: 'Technology', description: 'Custom software development.', city: 'Ontario', ownerName: 'John Smith' },
                { id: '3', name: 'Green Thumb Landscaping', industry: 'Services', description: 'Commercial landscaping.', city: 'San Bernardino', ownerName: 'Mike Johnson' },
                { id: '4', name: 'Creative Design Studio', industry: 'Design', description: 'Branding and web design.', city: 'Redlands', ownerName: 'Sarah Lee' },
            ];
        } else {
            businessCache = fetchedBusinesses;
        }

        await cacheService.set(CACHE_KEY_BUSINESSES, businessCache);
        return businessCache;
    } catch (error) {
        console.error("Error fetching businesses:", error);
        return [];
    }
};
