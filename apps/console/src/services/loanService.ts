import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    where,
    orderBy,
    addDoc,
    updateDoc,
    Timestamp,
    DocumentData
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Application, ApplicationStatus, ApplicationFlag } from '../types';

const COLLECTION = 'applications';

export const loanService = {
    /**
     * Fetch all applications with optional filtering
     */
    async getPipeline(filters?: {
        status?: ApplicationStatus;
        assignedTo?: string;
        limit?: number;
    }): Promise<Application[]> {
        try {
            let q = query(collection(db, COLLECTION), orderBy('lastUpdated', 'desc'));

            if (filters?.status) {
                q = query(q, where('status', '==', filters.status));
            }
            if (filters?.assignedTo) {
                q = query(q, where('assignedTo', '==', filters.assignedTo));
            }

            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Application));
        } catch (error) {
            console.error("Error fetching pipeline:", error);
            return [];
        }
    },

    /**
     * Get full details for a single application
     */
    async getApplication(id: string): Promise<Application | null> {
        try {
            const docRef = doc(db, COLLECTION, id);
            const snapshot = await getDoc(docRef);

            if (snapshot.exists()) {
                return { id: snapshot.id, ...snapshot.data() } as Application;
            }
            return null;
        } catch (error) {
            console.error("Error fetching application:", error);
            return null;
        }
    },

    /**
     * Update application status with validation logic (placeholder)
     */
    async updateStatus(id: string, status: ApplicationStatus): Promise<boolean> {
        try {
            const docRef = doc(db, COLLECTION, id);
            await updateDoc(docRef, {
                status,
                lastUpdated: Timestamp.now()
            });
            return true;
        } catch (error) {
            console.error("Error updating status:", error);
            return false;
        }
    },

    /**
     * Update flags (e.g. High Risk, Priority)
     */
    async updateFlags(id: string, flags: ApplicationFlag[]): Promise<boolean> {
        try {
            const docRef = doc(db, COLLECTION, id);
            await updateDoc(docRef, {
                flags,
                lastUpdated: Timestamp.now()
            });
            return true;
        } catch (error) {
            console.error("Error updating flags:", error);
            return false;
        }
    },

    /**
     * Assign application to a staff member
     */
    async assignTo(id: string, staffUid: string): Promise<boolean> {
        try {
            const docRef = doc(db, COLLECTION, id);
            await updateDoc(docRef, {
                assignedTo: staffUid,
                lastUpdated: Timestamp.now()
            });
            return true;
        } catch (error) {
            console.error("Error assigning application:", error);
            return false;
        }
    }
};
