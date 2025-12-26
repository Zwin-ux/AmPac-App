import {
    collection,
    doc,
    getDocs,
    query,
    where,
    addDoc,
    updateDoc,
    Timestamp
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import type { DocumentRequest, Document, DocumentRequestStatus } from '../types';

const REQUESTS_COLLECTION = 'document_requests';
const DOCS_COLLECTION = 'documents';

export const documentService = {
    /**
     * Get checklist (requests) for an application
     */
    async getChecklist(loanApplicationId: string): Promise<DocumentRequest[]> {
        try {
            const q = query(
                collection(db, REQUESTS_COLLECTION),
                where('loanApplicationId', '==', loanApplicationId)
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DocumentRequest));
        } catch (error) {
            console.error("Error fetching checklist:", error);
            return [];
        }
    },

    /**
     * Get actual uploaded documents for an application
     */
    async getDocuments(loanApplicationId: string): Promise<Document[]> {
        try {
            const q = query(
                collection(db, DOCS_COLLECTION),
                where('loanApplicationId', '==', loanApplicationId)
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Document));
        } catch (error) {
            console.error("Error fetching documents:", error);
            return [];
        }
    },

    /**
     * Create a new document request (checklist item)
     */
    async createRequest(request: Omit<DocumentRequest, 'id'>): Promise<string | null> {
        try {
            const docRef = await addDoc(collection(db, REQUESTS_COLLECTION), request);
            return docRef.id;
        } catch (error) {
            console.error("Error creating document request:", error);
            return null;
        }
    },

    /**
     * Update status of a document request (e.g. when file is uploaded or approved)
     */
    async updateRequestStatus(id: string, status: DocumentRequestStatus): Promise<boolean> {
        try {
            const docRef = doc(db, REQUESTS_COLLECTION, id);
            await updateDoc(docRef, { status });
            return true;
        } catch (error) {
            console.error("Error updating request status:", error);
            return false;
        }
    },

    /**
     * Record a new file upload
     */
    async recordUpload(docData: Omit<Document, 'id' | 'uploadedAt'>): Promise<string | null> {
        try {
            // 1. Create Document record
            const docRef = await addDoc(collection(db, DOCS_COLLECTION), {
                ...docData,
                uploadedAt: Timestamp.now()
            });

            // 2. Update linked request status if applicable
            if (docData.documentRequestId) {
                await this.updateRequestStatus(docData.documentRequestId, 'uploaded');
            }

            return docRef.id;
        } catch (error) {
            console.error("Error recording upload:", error);
            return null;
        }
    }
};
