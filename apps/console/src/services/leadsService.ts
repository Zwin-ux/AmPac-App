import { collection, getDocs, orderBy, query, doc, addDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import type { PreliminaryLead } from '../types';

export interface WebsiteLead {
    id: string;
    siteId?: string | null;
    slug?: string | null;
    name: string;
    email: string;
    message: string;
    createdAt?: Timestamp;
}

const WEBSITE_COLLECTION = 'website_leads';
const PRELIMINARY_COLLECTION = 'preliminary_leads';

export const leadsService = {
    async listLeads(): Promise<WebsiteLead[]> {
        try {
            const q = query(collection(db, WEBSITE_COLLECTION), orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WebsiteLead));
        } catch (error) {
            console.error('Error fetching website leads:', error);
            return [];
        }
    },

    async listPreliminaryLeads(): Promise<PreliminaryLead[]> {
        try {
            const q = query(collection(db, PRELIMINARY_COLLECTION), orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PreliminaryLead));
        } catch (error) {
            console.error('Error fetching preliminary leads:', error);
            return [];
        }
    },

    async updateLeadStatus(id: string, status: PreliminaryLead['status']): Promise<void> {
        const leadRef = doc(db, PRELIMINARY_COLLECTION, id);
        await updateDoc(leadRef, { status });
    },

    async assignLead(id: string, staffId: string): Promise<void> {
        const leadRef = doc(db, PRELIMINARY_COLLECTION, id);
        await updateDoc(leadRef, { assignedTo: staffId });
    },

    async addLeadNote(leadId: string, authorName: string, text: string): Promise<void> {
        const leadRef = doc(db, PRELIMINARY_COLLECTION, leadId);
        // We'll store notes as an array of objects
        const note = {
            authorName,
            text,
            createdAt: Timestamp.now()
        };
        // For simplicity in this "lite" version, we'll use arrayUnion if we have it, 
        // but here we just append to a local array field for now.
        const { arrayUnion } = await import('firebase/firestore');
        await updateDoc(leadRef, {
            notes: arrayUnion(note)
        });
    },

    async convertToApplication(lead: PreliminaryLead): Promise<string> {
        try {
            const appRef = collection(db, 'applications');
            const newApp = {
                userId: lead.userId,
                fullName: lead.fullName,
                email: lead.email,
                requestedAmount: lead.loanAmountDesired,
                yearsInBusiness: lead.yearsInBusiness,
                businessName: lead.businessIndustry + " Business", // Placeholder
                status: 'draft',
                type: 'sba_7a', // Default
                createdAt: Timestamp.now(),
                lastUpdated: Timestamp.now(),
                adminNotes: `Converted from preliminary lead. FICO Range: ${lead.ficoRange}. Purpose: ${lead.purpose}`,
                isQuickApply: true
            };

            const docRef = await addDoc(appRef, newApp);

            // Mark lead as converted
            await this.updateLeadStatus(lead.id, 'converted');

            return docRef.id;
        } catch (error) {
            console.error("Error converting lead:", error);
            throw error;
        }
    }
};
