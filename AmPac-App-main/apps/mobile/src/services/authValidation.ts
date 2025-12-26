/**
 * Authentication validation utilities
 * Provides testable validation logic for authentication flows
 */

import { ErrorMessage, getErrorMessage } from '../copy/errors';

export interface AuthValidationResult {
    isValid: boolean;
    error: ErrorMessage | null;
}

export interface SignInCredentials {
    email: string;
    password: string;
}

export interface SignUpCredentials {
    email: string;
    password: string;
    fullName: string;
    businessName: string;
    phone: string;
}

/**
 * Validates sign-in credentials before submission
 */
export function validateSignInCredentials(credentials: SignInCredentials): AuthValidationResult {
    const { email, password } = credentials;

    if (!email || !password) {
        return {
            isValid: false,
            error: getErrorMessage('validation'),
        };
    }

    if (!email.trim()) {
        return {
            isValid: false,
            error: getErrorMessage('validation'),
        };
    }

    if (!password.trim()) {
        return {
            isValid: false,
            error: getErrorMessage('validation'),
        };
    }

    return { isValid: true, error: null };
}

/**
 * Validates sign-up credentials before submission
 */
export function validateSignUpCredentials(credentials: SignUpCredentials): AuthValidationResult {
    const { email, password, fullName, businessName, phone } = credentials;

    if (!email || !password || !fullName || !businessName || !phone) {
        return {
            isValid: false,
            error: getErrorMessage('validation'),
        };
    }

    // Check for whitespace-only values
    if (!email.trim() || !password.trim() || !fullName.trim() || !businessName.trim() || !phone.trim()) {
        return {
            isValid: false,
            error: getErrorMessage('validation'),
        };
    }

    return { isValid: true, error: null };
}

/**
 * Maps Firebase auth error codes to user-friendly error messages
 */
export function mapFirebaseAuthError(errorCode: string): ErrorMessage {
    switch (errorCode) {
        case 'auth/network-request-failed':
            return getErrorMessage('networkUnavailable');

        case 'auth/invalid-credential':
        case 'auth/user-not-found':
        case 'auth/wrong-password':
            return getErrorMessage('signInFailed');

        case 'auth/invalid-email':
            return {
                ...getErrorMessage('validation'),
                detail: 'Please enter a valid email address.',
            };

        case 'auth/email-already-in-use':
            return {
                ...getErrorMessage('signUpFailed'),
                detail: 'That email is already in use. Try another or sign in.',
            };

        case 'auth/weak-password':
            return {
                ...getErrorMessage('signUpFailed'),
                detail: 'Password must be at least 6 characters.',
            };

        case 'auth/configuration-not-found':
            return {
                ...getErrorMessage('serverHiccup'),
                detail: 'Auth configuration is missing. Check your environment keys.',
            };

        case 'auth/too-many-requests':
            return getErrorMessage('rateLimited');

        default:
            return getErrorMessage('genericFallback');
    }
}

/**
 * Checks if an error message is displayed (non-null) without crashing
 * This is used to verify that error handling doesn't throw exceptions
 */
export function isErrorDisplayable(error: ErrorMessage | null): boolean {
    if (error === null) {
        return false;
    }
    // Verify the error has required properties
    return typeof error.title === 'string' && error.title.length > 0;
}
