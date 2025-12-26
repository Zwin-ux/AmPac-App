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

export interface StorageAdapter {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
};

const defaultStorageAdapter: StorageAdapter = {
    getItem: (key) => AsyncStorage.getItem(key),
    setItem: (key, value) => AsyncStorage.setItem(key, value),
};

let storageAdapter: StorageAdapter = defaultStorageAdapter;
let fallbackStorageAdapter: StorageAdapter = defaultStorageAdapter;

async function loadQueue(): Promise<SyncJob[]> {
    try {
        return await loadQueueFrom(storageAdapter);
    } catch (error) {
        console.error('Sync queue load failed', { adapter: getAdapterLabel(storageAdapter), error });
        if (fallbackStorageAdapter !== storageAdapter) {
            logSync('loadQueueFallback', { adapter: getAdapterLabel(fallbackStorageAdapter) });
            try {
                return await loadQueueFrom(fallbackStorageAdapter);
            } catch (fallbackError) {
                console.error('Sync queue fallback load failed', fallbackError);
            }
        }
        return [];
    }
}

async function saveQueue(queue: SyncJob[]): Promise<void> {
    const payload = JSON.stringify(queue);
    try {
        await storageAdapter.setItem(QUEUE_KEY, payload);
    } catch (error) {
        console.error('Sync queue persist failed', { adapter: getAdapterLabel(storageAdapter), error });
        if (fallbackStorageAdapter !== storageAdapter) {
            logSync('saveQueueFallback', {
                adapter: getAdapterLabel(fallbackStorageAdapter),
                queueLength: queue.length,
            });
            try {
                await fallbackStorageAdapter.setItem(QUEUE_KEY, payload);
                return;
            } catch (fallbackError) {
                console.error('Sync queue fallback persist failed', fallbackError);
                throw fallbackError;
            }
        }
        throw error;
    }
}

const getAdapterLabel = (adapter: StorageAdapter) =>
    adapter === defaultStorageAdapter ? 'defaultAsyncStorage' : 'customAdapter';

const loadQueueFrom = async (adapter: StorageAdapter): Promise<SyncJob[]> => {
    const raw = await adapter.getItem(QUEUE_KEY);
    if (!raw) {
        return [];
    }
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? (parsed as SyncJob[]) : [];
    } catch (error) {
        console.error('Sync queue JSON parse failed', { adapter: getAdapterLabel(adapter), error });
        return [];
    }
};

const logSync = (message: string, meta?: Record<string, any>) => {
    console.debug(`[sync] ${message}`, meta ?? '');
};

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
        logSync('queueWrite', {
            doc: `${job.collection}/${job.docId}`,
            jobId: newJob.id,
            merged: filtered.length < queue.length,
            queueLength: filtered.length,
        });
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
        logSync('flushQueue', { processed: queue.length - remaining.length, remaining: remaining.length });
    },
    clearQueue: async () => {
        await saveQueue([]);
        logSync('clearQueue', { queueLength: 0 });
    },
    getQueueLength: async () => {
        const queue = await loadQueue();
        logSync('getQueueLength', { queueLength: queue.length });
        return queue.length;
    }
};

export const inspectSyncQueue = async (): Promise<SyncJob[]> => {
    const queue = await loadQueue();
    logSync('inspectSyncQueue', { queueLength: queue.length });
    return queue;
};

export const overrideSyncStorageAdapter = (adapter: StorageAdapter) => {
    const previous = storageAdapter;
    storageAdapter = adapter;
    logSync('overrideStorageAdapter', {});
    return () => {
        storageAdapter = previous;
        logSync('restoreStorageAdapter', {});
    };
};

export const overrideSyncFallbackAdapter = (adapter: StorageAdapter) => {
    const previous = fallbackStorageAdapter;
    fallbackStorageAdapter = adapter;
    logSync('overrideFallbackAdapter', { adapter: getAdapterLabel(adapter) });
    return () => {
        fallbackStorageAdapter = previous;
        logSync('restoreFallbackAdapter', { adapter: getAdapterLabel(previous) });
    };
};
