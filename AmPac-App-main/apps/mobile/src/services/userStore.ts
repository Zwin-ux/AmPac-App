import AsyncStorage from '../utils/asyncStorageOptimization';
import { Timestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { User } from '../types';
import { getCurrentUserDoc } from './firestore';
import { app } from '../../firebaseConfig';

const USER_STORAGE_KEY = 'user_profile_v1';

type Subscriber = (user: User | null) => void;

class UserStore {
    private user: User | null = null;
    private isHydrated = false;
    private subscribers: Set<Subscriber> = new Set();

    // SYNC: Get cached user instantly
    getCachedUser(): User | null {
        return this.user;
    }

    // SYNC: Check if hydrated
    getIsHydrated(): boolean {
        return this.isHydrated;
    }

    subscribe(callback: Subscriber): () => void {
        this.subscribers.add(callback);
        callback(this.user);
        return () => this.subscribers.delete(callback);
    }

    // Set user manually (e.g. after sign up)
    async setUser(user: User) {
        this.user = user;
        this.isHydrated = true;
        this.notify();
        await this.persistToStorage(user);
    }

    private notify() {
        this.subscribers.forEach(cb => cb(this.user));
    }

    // ASYNC: Hydrate from storage (fast)
    async hydrateFromStorage(): Promise<User | null> {
        try {
            const stored = await AsyncStorage.getItem(USER_STORAGE_KEY);
            if (stored) {
                this.user = JSON.parse(stored);
                this.isHydrated = true;
                this.notify();
                return this.user;
            }
        } catch (error) {
            console.error('Error hydrating user from storage:', error);
        }
        this.isHydrated = true;
        return null;
    }

    // ASYNC: Sync with server
    async syncWithServer(): Promise<User | null> {
        try {
            const auth = getAuth(app);
            const uid = auth.currentUser?.uid;
            if (!uid) {
                return null;
            }

            const serverUser = await getCurrentUserDoc(uid);
            if (serverUser) {
                this.user = serverUser;
                await this.persistToStorage(serverUser);
                this.notify();
                return serverUser;
            }
        } catch (error) {
            console.error('Error syncing user with server:', error);
        }
        return this.user;
    }

    private async persistToStorage(user: User): Promise<void> {
        try {
            await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
        } catch (error) {
            console.error('Error persisting user to storage:', error);
        }
    }

    async clearUser(): Promise<void> {
        this.user = null;
        this.notify();
        await AsyncStorage.removeItem(USER_STORAGE_KEY);
    }
}

export const userStore = new UserStore();
