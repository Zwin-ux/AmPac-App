import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Timestamp } from 'firebase/firestore';

export interface WebsiteLead {
    id: string;
    siteId?: string | null;
    slug?: string | null;
    name: string;
    email: string;
    message: string;
    createdAt?: Timestamp;
}

const COLLECTION = 'website_leads';

export const leadsService = {
    async listLeads(): Promise<WebsiteLead[]> {
        try {
            const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WebsiteLead));
        } catch (error) {
            console.error('Error fetching website leads:', error);
            return [];
        }
    }
};
