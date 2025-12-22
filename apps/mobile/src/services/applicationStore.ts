import AsyncStorage from '@react-native-async-storage/async-storage';
import { Timestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { Application, ApplicationType, SyncStatus, QuickApplyData } from '../types';
import { getApplication, saveApplication } from './applications';
import { app } from '../../firebaseConfig';
import { getCurrentUserId } from './authUtils';

const DRAFT_STORAGE_KEY = 'app_draft_v1';
const SAVE_DEBOUNCE_MS = 800;

const logStoreEvent = (event: string, meta?: Record<string, any>) => {
    console.debug(`[ApplicationStore] ${event}`, meta ?? {});
};

type Subscriber = (state: ApplicationStoreState) => void;

export interface ApplicationStoreState {
    draft: Application | null;
    syncStatus: SyncStatus;
    lastSyncedAt: number | null;
    isHydrated: boolean;
}

class ApplicationStore {
    private state: ApplicationStoreState = {
        draft: null,
        syncStatus: 'idle',
        lastSyncedAt: null,
        isHydrated: false,
    };

    private subscribers: Set<Subscriber> = new Set();
    private saveTimer: ReturnType<typeof setTimeout> | null = null;
    private pendingSave: Application | null = null;

    // ============ SYNC GETTERS (instant, no await) ============

    getCachedDraft(): Application | null {
        return this.state.draft;
    }

    getSyncStatus(): SyncStatus {
        return this.state.syncStatus;
    }

    getState(): ApplicationStoreState {
        return { ...this.state };
    }

    isHydrated(): boolean {
        return this.state.isHydrated;
    }

    // ============ SUBSCRIPTIONS ============

    subscribe(callback: Subscriber): () => void {
        this.subscribers.add(callback);
        // Immediately call with current state
        callback(this.state);
        return () => this.subscribers.delete(callback);
    }

    private notify() {
        this.subscribers.forEach(cb => cb(this.state));
    }

    private setState(partial: Partial<ApplicationStoreState>) {
        this.state = { ...this.state, ...partial };
        this.notify();
    }

    // ============ ASYNC HYDRATION ============

    async hydrateFromStorage(): Promise<Application | null> {
        try {
            const stored = await AsyncStorage.getItem(DRAFT_STORAGE_KEY);
            if (stored) {
                const draft = JSON.parse(stored) as Application;
                this.setState({ draft, isHydrated: true, syncStatus: 'local' });
                logStoreEvent('hydrateFromStorage', { hasDraft: true });
                return draft;
            }
            this.setState({ isHydrated: true });
            logStoreEvent('hydrateFromStorage', { hasDraft: false });
            return null;
        } catch (error) {
            console.error('Error hydrating from storage:', error);
            logStoreEvent('hydrateFromStorage.error', { error });
            this.setState({ isHydrated: true });
            return null;
        }
    }

    async syncWithServer(): Promise<Application | null> {
        const userId = getCurrentUserId();
        
        if (!userId) {
            this.setState({ syncStatus: 'idle' });
            return null;
        }

        this.setState({ syncStatus: 'syncing' });
        logStoreEvent('syncWithServer.start', { userId });

        try {
            const serverApp = await getApplication(userId);

            if (serverApp) {
                const localDraft = this.state.draft;

                // Merge strategy: server wins unless local has higher version
                if (localDraft && (localDraft.version ?? 0) > (serverApp.version ?? 0)) {
                    // Local is newer, push to server
                    await this.persistToServer(localDraft);
                    this.setState({ syncStatus: 'synced', lastSyncedAt: Date.now() });
                    return localDraft;
                } else {
                    // Server is newer or equal, use server data
                    this.setState({
                        draft: serverApp,
                        syncStatus: 'synced',
                        lastSyncedAt: Date.now()
                    });
                    await this.persistToStorage(serverApp);
                    return serverApp;
                }
            } else {
                this.setState({ syncStatus: 'synced', lastSyncedAt: Date.now() });
                logStoreEvent('syncWithServer.nodata', { userId });
                return this.state.draft;
            }
        } catch (error) {
            console.error('Error syncing with server:', error);
            logStoreEvent('syncWithServer.error', { error });
            this.setState({ syncStatus: 'offline' });
            return this.state.draft;
        }
    }

    // ============ SYNC UPDATES (instant) ============

    updateField<K extends keyof Application>(field: K, value: Application[K]): Application | null {
        if (!this.state.draft) return null;

        const updated: Application = {
            ...this.state.draft,
            [field]: value,
            version: (this.state.draft.version ?? 1) + 1,
        };

        this.setState({ draft: updated, syncStatus: 'local' });
        this.queueSave(updated);
        return updated;
    }

    updateFields(fields: Partial<Application>): Application | null {
        if (!this.state.draft) return null;

        const updated: Application = {
            ...this.state.draft,
            ...fields,
            version: (this.state.draft.version ?? 1) + 1,
        };

        this.setState({ draft: updated, syncStatus: 'local' });
        this.queueSave(updated);
        return updated;
    }

    setStep(step: number): Application | null {
        return this.updateField('currentStep', step);
    }

    // ============ CREATE NEW DRAFT (instant local, async server) ============

    createDraft(type: ApplicationType, prefill?: Partial<Application>): Application {
        const userId = getCurrentUserId();
        if (!userId) throw new Error("User not authenticated");
        const now = Timestamp.now();

        const draft: Application = {
            id: `app_${Date.now()}`,
            userId,
            type,
            status: 'draft',
            currentStep: 1,
            version: 1,
            businessName: prefill?.businessName || '',
            yearsInBusiness: prefill?.yearsInBusiness || 0,
            annualRevenue: prefill?.annualRevenue || 0,
            loanAmount: prefill?.loanAmount || 0,
            useOfFunds: prefill?.useOfFunds || '',
            phone: prefill?.phone || '',
            data: {},
            createdAt: now,
            lastUpdated: now,
        };

        this.setState({ draft, syncStatus: 'local' });
        this.persistToStorage(draft);
        this.persistToServerAsync(draft);

        return draft;
    }

    createQuickDraft(data: QuickApplyData): Application {
        const userId = getCurrentUserId();
        if (!userId) throw new Error("User not authenticated");
        const now = Timestamp.now();

        const draft: Application = {
            id: `app_${Date.now()}`,
            userId,
            type: data.type,
            status: 'quick_draft',
            currentStep: 0,
            version: 1,
            isQuickApply: true,
            businessName: data.businessName,
            loanAmount: data.loanAmount,
            phone: data.phone,
            data: {},
            createdAt: now,
            lastUpdated: now,
        };

        this.setState({ draft, syncStatus: 'local' });
        this.persistToStorage(draft);
        this.persistToServerAsync(draft);

        return draft;
    }

    // ============ SAVE QUEUE (debounced) ============

    private queueSave(draft: Application) {
        this.pendingSave = draft;
        this.persistToStorage(draft); // Always save locally immediately

        if (this.saveTimer) {
            clearTimeout(this.saveTimer);
        }

        this.saveTimer = setTimeout(() => {
            if (this.pendingSave) {
                this.persistToServerAsync(this.pendingSave);
                this.pendingSave = null;
            }
        }, SAVE_DEBOUNCE_MS);
        logStoreEvent('queueSave', { appId: draft.id, nextSyncStatus: this.state.syncStatus });
    }

    async flushSave(): Promise<void> {
        if (this.saveTimer) {
            clearTimeout(this.saveTimer);
            this.saveTimer = null;
        }

        const draft = this.pendingSave || this.state.draft;
        if (draft) {
            await this.persistToServer(draft);
            this.pendingSave = null;
        }
    }

    // ============ PERSISTENCE ============

    private async persistToStorage(draft: Application): Promise<void> {
        try {
            await AsyncStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
        } catch (error) {
            console.error('Error persisting to storage:', error);
            logStoreEvent('persistToStorage.error', { appId: draft.id, error });
        }
    }

    private async persistToServer(draft: Application): Promise<void> {
        this.setState({ syncStatus: 'syncing' });
        logStoreEvent('persistToServer.start', { appId: draft.id });
        try {
            await saveApplication(draft.id, {
                ...draft,
                lastUpdated: Timestamp.now(),
            });
            this.setState({ syncStatus: 'synced', lastSyncedAt: Date.now() });
            logStoreEvent('persistToServer.success', { appId: draft.id });
        } catch (error) {
            console.error('Error persisting to server:', error);
            logStoreEvent('persistToServer.error', { appId: draft.id, error });
            this.setState({ syncStatus: 'offline' });
        }
    }

    private persistToServerAsync(draft: Application): void {
        this.persistToServer(draft).catch(() => {
            // Error already logged in persistToServer
        });
    }

    // ============ PREFILL FROM USER PROFILE ============

    async getPrefillData(): Promise<Partial<Application>> {
        // Import userStore dynamically to avoid circular dependency
        const { userStore } = await import('./userStore');
        const user = userStore.getCachedUser();

        if (user) {
            return {
                businessName: user.businessName || '',
                phone: user.phone || '',
            };
        }
        return {};
    }

    // Create draft with auto-prefill
    async createDraftWithPrefill(type: ApplicationType): Promise<Application> {
        const prefill = await this.getPrefillData();
        return this.createDraft(type, prefill);
    }

    // ============ CLEAR ============

    async submit(): Promise<void> {
        if (!this.state.draft) return;

        this.setState({ syncStatus: 'syncing' });
        try {
            // 1. Ensure pending saves are flushed
            await this.flushSave();

            // 2. Call API
            const { submitApplication } = await import('./applications');
            await submitApplication(this.state.draft);

            // 3. Update local state
            this.updateField('status', 'submitted');
            this.setState({ syncStatus: 'synced' });
        } catch (error) {
            console.error('Error submitting application:', error);
            this.setState({ syncStatus: 'error' });
            throw error;
        }
    }

    async clearDraft(): Promise<void> {
        this.setState({ draft: null, syncStatus: 'idle', lastSyncedAt: null });
        await AsyncStorage.removeItem(DRAFT_STORAGE_KEY);
    }
}

// Singleton instance
export const applicationStore = new ApplicationStore();

// Export class for testing
export { ApplicationStore };
