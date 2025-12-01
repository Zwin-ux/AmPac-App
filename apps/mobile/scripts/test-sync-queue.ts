import { syncService, inspectSyncQueue, overrideSyncStorageAdapter, overrideSyncFallbackAdapter } from '../src/services/sync';
import type { StorageAdapter } from '../src/services/sync';

const expect = (condition: boolean, message: string) => {
    if (!condition) {
        throw new Error(`Assertion failed: ${message}`);
    }
};

class InMemoryStorage implements StorageAdapter {
    private store = new Map<string, string>();

    async getItem(key: string) {
        return this.store.get(key) ?? null;
    }

    async setItem(key: string, value: string) {
        this.store.set(key, value);
    }
}

class FailingStorageAdapter implements StorageAdapter {
    private store = new Map<string, string>();
    public failNextSet = true;
    public failNextGet = false;

    async getItem(key: string) {
        if (this.failNextGet) {
            this.failNextGet = false;
            throw new Error('Simulated get failure');
        }
        return this.store.get(key) ?? null;
    }

    async setItem(key: string, value: string) {
        if (this.failNextSet) {
            this.failNextSet = false;
            throw new Error('Simulated set failure');
        }
        this.store.set(key, value);
    }
}

const testQueueDeduplication = async () => {
    await syncService.clearQueue();

    await syncService.queueWrite({
        collection: 'applications',
        docId: 'app-dedup',
        payload: { step: 1 },
        merge: true,
    });

    let queue = await inspectSyncQueue();
    expect(queue.length === 1, 'Expected queue to contain one job after first write');

    await syncService.queueWrite({
        collection: 'applications',
        docId: 'app-dedup',
        payload: { step: 2 },
        merge: true,
    });

    queue = await inspectSyncQueue();
    expect(queue.length === 1, 'Queue should remain deduplicated when the same doc is queued twice');
    expect(queue[0].payload.step === 2, 'Queue should keep the most recent payload');
};

const testFlushRetryKeepsJob = async () => {
    await syncService.clearQueue();

    await syncService.queueWrite({
        collection: 'applications',
        docId: 'app-flush',
        payload: { status: 'draft' },
        merge: true,
    });

    let attempts = 0;
    await syncService.flushQueue(async () => {
        attempts += 1;
        if (attempts === 1) {
            throw new Error('Simulated failure');
        }
    });

    const queue = await inspectSyncQueue();
    expect(queue.length === 1, 'Failed flush should keep the job in the queue');
};

const testQueueWriteAdapterFallback = async () => {
    await syncService.clearQueue();

    const adapter = new FailingStorageAdapter();
    const restore = overrideSyncStorageAdapter(adapter);

    try {
        await syncService.queueWrite({
            collection: 'applications',
            docId: 'app-fallback',
            payload: { status: 'draft' },
            merge: true,
        });

        adapter.failNextGet = true; // force fallback on inspect

        const queue = await inspectSyncQueue();
        expect(queue.length === 1, 'Fallback should keep the job when adapter setItem throws');
    } finally {
        restore();
    }
};

const run = async () => {
    const storage = new InMemoryStorage();
    const restore = overrideSyncStorageAdapter(storage);
    const restoreFallback = overrideSyncFallbackAdapter(storage);

    try {
        await testQueueDeduplication();
        await testFlushRetryKeepsJob();
        await testQueueWriteAdapterFallback();
        console.log('Sync queue tests passed ✅');
    } catch (error) {
        console.error('Sync queue tests failed', error);
        process.exitCode = 1;
    } finally {
        restore();
        restoreFallback();
    }
};

run();
