import {
    collection,
    doc,
    getDocs,
    query,
    where,
    orderBy,
    addDoc,
    updateDoc,
    Timestamp
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import type { Task, TaskStatus } from '../types';

const COLLECTION = 'tasks';

export const taskService = {
    /**
     * Get tasks for a specific application
     */
    async getTasksByApplication(loanApplicationId: string): Promise<Task[]> {
        try {
            const q = query(
                collection(db, COLLECTION),
                where('loanApplicationId', '==', loanApplicationId),
                orderBy('createdAt', 'desc')
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
        } catch (error) {
            console.error("Error fetching tasks:", error);
            return [];
        }
    },

    /**
     * Get tasks assigned to a specific user
     */
    async getMyTasks(userId: string): Promise<Task[]> {
        try {
            const q = query(
                collection(db, COLLECTION),
                where('assignedTo', '==', userId),
                where('status', '!=', 'completed'),
                orderBy('status'),
                orderBy('priority', 'desc')
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
        } catch (error) {
            console.error("Error fetching my tasks:", error);
            return [];
        }
    },

    /**
     * Create a new task
     */
    async createTask(task: Omit<Task, 'id' | 'createdAt'>): Promise<string | null> {
        try {
            const docRef = await addDoc(collection(db, COLLECTION), {
                ...task,
                createdAt: Timestamp.now()
            });
            return docRef.id;
        } catch (error) {
            console.error("Error creating task:", error);
            return null;
        }
    },

    /**
     * Update task status
     */
    async updateStatus(id: string, status: TaskStatus): Promise<boolean> {
        try {
            const docRef = doc(db, COLLECTION, id);
            const updates: any = { status };
            if (status === 'completed') {
                updates.completedAt = Timestamp.now();
            }
            await updateDoc(docRef, updates);
            return true;
        } catch (error) {
            console.error("Error updating task status:", error);
            return false;
        }
    }
};
