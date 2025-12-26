import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { cacheService } from './cache';
import type { MarketplaceItem } from '../types';

const CACHE_KEY_MARKETPLACE = 'cache_marketplace_items_v1';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

let inMemoryCache: MarketplaceItem[] | null = null;

const FALLBACK_ITEMS: MarketplaceItem[] = [
    {
        id: 'bpt',
        title: 'Business Power Tools',
        description: 'Business plan + SBA resources for investor funding.',
        category: 'Tools',
        url: 'https://www.businesspowertools.com/ampac-business-plan-for-sba-loans-and-investor-funding/',
        badge: 'Partner',
        priceLabel: 'From $',
        featured: true,
        sortOrder: 10,
    },
    {
        id: 'ecredable-business',
        title: 'Ecredable Business Credit Lift',
        description: 'Build business credit and strengthen your profile.',
        category: 'Credit',
        // url: 'https://business.ecredable.com/ampac', // Temporarily disabled - link not active
        badge: 'Partner',
        priceLabel: 'Partner pricing',
        featured: true,
        sortOrder: 9,
    },
    {
        id: 'ecredable-personal',
        title: 'Ecredable Personal Credit Lift',
        description: 'Improve your personal credit health.',
        category: 'Credit',
        url: 'https://ecredable.com/ampac',
        badge: 'Partner',
        priceLabel: 'Partner pricing',
        sortOrder: 8,
    },
    {
        id: 'sbdc',
        title: 'SBDC Free Consulting',
        description: 'Find local small business consulting near you.',
        category: 'Consulting',
        url: 'https://americassbdc.org/',
        badge: 'Free',
        priceLabel: 'Free',
        sortOrder: 7,
    },
    {
        id: 'score',
        title: 'SCORE Free Mentoring',
        description: 'Free mentoring, templates, and workshops.',
        category: 'Consulting',
        url: 'https://www.score.org/',
        badge: 'Free',
        priceLabel: 'Free',
        sortOrder: 6,
    },
    {
        id: 'wbc',
        title: "Women’s Business Center",
        description: 'SBA resource partners and support programs.',
        category: 'Consulting',
        url: 'https://www.sba.gov/local-assistance/resource-partners/womens-business-centers',
        badge: 'Free',
        priceLabel: 'Free',
        sortOrder: 5,
    },
];

const normalize = (item: MarketplaceItem): MarketplaceItem => ({
    ...item,
    category: item.category || 'Other',
    sortOrder: typeof item.sortOrder === 'number' ? item.sortOrder : 0,
});

export const marketplaceService = {
    getItems: async (forceRefresh = false): Promise<MarketplaceItem[]> => {
        if (inMemoryCache && !forceRefresh) return inMemoryCache;

        if (!forceRefresh) {
            const cached = await cacheService.get<MarketplaceItem[]>(CACHE_KEY_MARKETPLACE, CACHE_TTL_MS);
            if (cached?.length) {
                inMemoryCache = cached.map(normalize);
                return inMemoryCache;
            }
        }

        try {
            const ref = collection(db, 'marketplace_items');
            const q = query(ref, orderBy('sortOrder', 'desc'));
            const snap = await getDocs(q);
            const items: MarketplaceItem[] = snap.docs.map((d) => normalize({ id: d.id, ...(d.data() as any) }));

            if (!items.length) {
                inMemoryCache = FALLBACK_ITEMS.map(normalize);
                await cacheService.set(CACHE_KEY_MARKETPLACE, inMemoryCache);
                return inMemoryCache;
            }

            inMemoryCache = items;
            await cacheService.set(CACHE_KEY_MARKETPLACE, items);
            return items;
        } catch (err) {
            console.error('Marketplace: failed to load items', err);
            inMemoryCache = FALLBACK_ITEMS.map(normalize);
            return inMemoryCache;
        }
    },
};

