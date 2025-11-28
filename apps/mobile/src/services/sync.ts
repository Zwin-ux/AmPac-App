import AsyncStorage from '@react-native-async-storage/async-storage';

export type SyncJob = {
    id: string;
    collection: string;
    docId: string;
    payload: Record<string, any>;
    merge?: boolean;
    timestamp: number;
};

const QUEUE_KEY = 'sync_queue_v1';

async function loadQueue(): Promise<SyncJob[]> {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    try {
        return JSON.parse(raw) as SyncJob[];
    } catch {
        return [];
    }
}

async function saveQueue(queue: SyncJob[]): Promise<void> {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export const syncService = {
    queueWrite: async (job: Omit<SyncJob, 'id' | 'timestamp'>) => {
        const queue = await loadQueue();
        // Keep only the latest job per collection/docId
        const filtered = queue.filter(
            existing => !(existing.collection === job.collection && existing.docId === job.docId)
        );
        const newJob: SyncJob = {
            ...job,
            id: `${job.collection}_${job.docId}_${Date.now()}`,
            timestamp: Date.now(),
        };
        filtered.push(newJob);
        await saveQueue(filtered);
    },
    flushQueue: async (executor: (job: SyncJob) => Promise<void>) => {
        const queue = await loadQueue();
        if (queue.length === 0) return;

        const remaining: SyncJob[] = [];
        for (const job of queue) {
            try {
                await executor(job);
            } catch (error) {
                console.error('Sync flush error', error);
                remaining.push(job);
            }
        }
        await saveQueue(remaining);
    },
    clearQueue: async () => {
        await saveQueue([]);
    },
    getQueueLength: async () => {
        const queue = await loadQueue();
        return queue.length;
    }
};
