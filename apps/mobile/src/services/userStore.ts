import AsyncStorage from '@react-native-async-storage/async-storage';
import { Timestamp } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
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

    // DEMO: Manually set user for demo mode (bypasses Firebase Auth)
    setDemoUser(user: User) {
        this.user = user;
        this.isHydrated = true;
        this.notify();
        this.persistToStorage(user);
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

    // ASYNC: Sync with server (slow, background)
    async syncWithServer(): Promise<User | null> {
        try {
            const auth = getAuth(app);
            const uid = auth.currentUser?.uid;
            if (!uid) {
                // Dev mode: attempt anonymous sign-in so Firestore rules see a real auth user
                if (__DEV__) {
                    try {
                        const authInst = getAuth(app);
                        const signInResult = await signInAnonymously(authInst);
                        const anonUid = authInst.currentUser?.uid;
                        if (anonUid) {
                            // Create a lightweight dev user doc to satisfy rules that check users collection
                            const { setDoc, doc } = await import('firebase/firestore');
                            const { db } = await import('../../firebaseConfig');
                            const devDoc = doc(db, 'users', anonUid);
                            await setDoc(devDoc, {
                                uid: anonUid,
                                role: 'entrepreneur',
                                fullName: 'AmPac Dev User',
                                businessName: 'Dev Business Inc.',
                                createdAt: Timestamp.now(),
                            }, { merge: true });

                            const devUser: User = {
                                uid: anonUid,
                                role: 'entrepreneur',
                                fullName: 'AmPac Dev User',
                                businessName: 'Dev Business Inc.',
                                phone: '555-0123',
                                createdAt: Timestamp.now(),
                            };
                            this.user = devUser;
                            await this.persistToStorage(devUser);
                            this.notify();
                            return devUser;
                        }
                    } catch (e) {
                        console.warn('Anonymous sign-in failed:', e);
                    }
                }
                return null;
            }

            const serverUser = await getCurrentUserDoc(uid);
            if (serverUser) {
                this.user = serverUser;
                await this.persistToStorage(serverUser);
                this.notify();
                return serverUser;
            } else {
                // Check if this is the demo user and create a profile if missing
                if (auth.currentUser?.email === 'demo@ampac.com') {
                    const { createUserDoc } = await import('./firestore');
                    const demoProfile: User = {
                        uid: uid,
                        role: 'entrepreneur',
                        fullName: 'Alex Rivera',
                        businessName: 'Rivera Innovations',
                        phone: '909-555-0101',
                        industry: 'Technology',
                        city: 'Riverside',
                        bio: 'Building the future of sustainable tech in the Inland Empire.',
                        jobTitle: 'Founder & CEO',
                        createdAt: Timestamp.now(),
                    };
                    await createUserDoc(demoProfile);
                    this.user = demoProfile;
                    await this.persistToStorage(demoProfile);
                    this.notify();
                    return demoProfile;
                }
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
