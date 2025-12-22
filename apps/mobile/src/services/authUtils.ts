import { auth } from '../../firebaseConfig';

/**
 * Get the current user ID, falling back to 'dev-user' only in development mode.
 * Returns null if no user is authenticated and not in development mode.
 */
export const getCurrentUserId = (): string | null => {
    const user = auth.currentUser;
    if (user) return user.uid;
    
    if (__DEV__) {
        return 'dev-user';
    }
    
    return null;
};

/**
 * Get the current user's display name, falling back to 'AmPac User' in development mode.
 */
export const getCurrentDisplayName = (): string => {
    const user = auth.currentUser;
    if (user?.displayName) return user.displayName;
    
    if (__DEV__) {
        return 'Test Entrepreneur';
    }
    
    return 'AmPac User';
};

/**
 * Check if the current user is the 'dev-user'.
 */
export const isDevUser = (uid: string | null): boolean => {
    return uid === 'dev-user';
};
