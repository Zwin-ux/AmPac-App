import { auth } from '../../firebaseConfig';

/**
 * Get the current user ID.
 * Returns null if no user is authenticated.
 */
export const getCurrentUserId = (): string | null => {
    const user = auth.currentUser;
    if (user) return user.uid;
    return null;
};

/**
 * Get the current user's display name.
 */
export const getCurrentDisplayName = (): string => {
    const user = auth.currentUser;
    if (user?.displayName) return user.displayName;
    return 'AmPac User';
};

/**
 * Check if user is authenticated.
 */
export const isAuthenticated = (): boolean => {
    return auth.currentUser !== null;
};
