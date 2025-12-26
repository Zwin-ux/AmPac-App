/**
 * Authentication Validation Tests
 * Feature: app-store-deployment
 * 
 * Tests for authentication error handling and validation
 */

import * as fc from 'fast-check';
import {
    validateSignInCredentials,
    validateSignUpCredentials,
    mapFirebaseAuthError,
    isErrorDisplayable,
    SignInCredentials,
    SignUpCredentials,
} from './authValidation';

describe('Authentication Validation', () => {
    describe('validateSignInCredentials', () => {
        it('should return valid for proper credentials', () => {
            const result = validateSignInCredentials({
                email: 'test@example.com',
                password: 'password123',
            });
            expect(result.isValid).toBe(true);
            expect(result.error).toBeNull();
        });

        it('should return invalid for empty email', () => {
            const result = validateSignInCredentials({
                email: '',
                password: 'password123',
            });
            expect(result.isValid).toBe(false);
            expect(result.error).not.toBeNull();
            expect(result.error?.title).toBeTruthy();
        });

        it('should return invalid for empty password', () => {
            const result = validateSignInCredentials({
                email: 'test@example.com',
                password: '',
            });
            expect(result.isValid).toBe(false);
            expect(result.error).not.toBeNull();
        });

        it('should return invalid for whitespace-only email', () => {
            const result = validateSignInCredentials({
                email: '   ',
                password: 'password123',
            });
            expect(result.isValid).toBe(false);
            expect(result.error).not.toBeNull();
        });
    });

    describe('validateSignUpCredentials', () => {
        it('should return valid for complete credentials', () => {
            const result = validateSignUpCredentials({
                email: 'test@example.com',
                password: 'password123',
                fullName: 'John Doe',
                businessName: 'Acme Corp',
                phone: '555-0123',
            });
            expect(result.isValid).toBe(true);
            expect(result.error).toBeNull();
        });

        it('should return invalid for missing fields', () => {
            const result = validateSignUpCredentials({
                email: 'test@example.com',
                password: 'password123',
                fullName: '',
                businessName: 'Acme Corp',
                phone: '555-0123',
            });
            expect(result.isValid).toBe(false);
            expect(result.error).not.toBeNull();
        });
    });

    describe('mapFirebaseAuthError', () => {
        it('should map network error correctly', () => {
            const error = mapFirebaseAuthError('auth/network-request-failed');
            expect(error.title).toContain("can't reach");
        });

        it('should map invalid credential error correctly', () => {
            const error = mapFirebaseAuthError('auth/invalid-credential');
            expect(error.title).toContain("couldn't sign you in");
        });

        it('should map invalid email error correctly', () => {
            const error = mapFirebaseAuthError('auth/invalid-email');
            expect(error.detail).toContain('valid email');
        });

        it('should map email-already-in-use error correctly', () => {
            const error = mapFirebaseAuthError('auth/email-already-in-use');
            expect(error.detail).toContain('already in use');
        });

        it('should map weak-password error correctly', () => {
            const error = mapFirebaseAuthError('auth/weak-password');
            expect(error.detail).toContain('6 characters');
        });

        it('should return generic fallback for unknown errors', () => {
            const error = mapFirebaseAuthError('auth/unknown-error');
            expect(error.title).toBeTruthy();
        });
    });
});

/**
 * Property-Based Tests for Authentication
 * Feature: app-store-deployment, Property 2: Invalid Credential Error Handling
 * Validates: Requirements 1.4, 1.6
 */
describe('Property-Based Tests: Invalid Credential Error Handling', () => {
    // Property 2: Invalid Credential Error Handling
    // For any invalid credential combination (empty email, malformed email, short password, etc.),
    // the authentication flow SHALL display an error message without crashing the application.

    it('Property 2: For any empty or whitespace-only email, validation returns displayable error without crashing', () => {
        // Generate whitespace strings
        const whitespaceArb = fc.array(fc.constant(' '), { minLength: 1, maxLength: 10 })
            .map(arr => arr.join(''));
        
        fc.assert(
            fc.property(
                fc.oneof(
                    fc.constant(''),
                    whitespaceArb
                ),
                fc.string({ minLength: 1, maxLength: 50 }),
                (email, password) => {
                    // This should not throw
                    const result = validateSignInCredentials({ email, password });
                    
                    // Should return invalid
                    expect(result.isValid).toBe(false);
                    
                    // Error should be displayable (not null and has title)
                    expect(isErrorDisplayable(result.error)).toBe(true);
                    
                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    it('Property 2: For any empty or whitespace-only password, validation returns displayable error without crashing', () => {
        // Generate whitespace strings
        const whitespaceArb = fc.array(fc.constant(' '), { minLength: 1, maxLength: 10 })
            .map(arr => arr.join(''));
        
        fc.assert(
            fc.property(
                fc.emailAddress(),
                fc.oneof(
                    fc.constant(''),
                    whitespaceArb
                ),
                (email, password) => {
                    // This should not throw
                    const result = validateSignInCredentials({ email, password });
                    
                    // Should return invalid
                    expect(result.isValid).toBe(false);
                    
                    // Error should be displayable
                    expect(isErrorDisplayable(result.error)).toBe(true);
                    
                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    it('Property 2: For any Firebase auth error code, mapFirebaseAuthError returns displayable error without crashing', () => {
        const knownErrorCodes = [
            'auth/network-request-failed',
            'auth/invalid-credential',
            'auth/invalid-email',
            'auth/user-not-found',
            'auth/wrong-password',
            'auth/email-already-in-use',
            'auth/weak-password',
            'auth/configuration-not-found',
            'auth/too-many-requests',
        ];

        fc.assert(
            fc.property(
                fc.oneof(
                    fc.constantFrom(...knownErrorCodes),
                    fc.string({ minLength: 5, maxLength: 50 }).map(s => `auth/${s}`)
                ),
                (errorCode) => {
                    // This should not throw
                    const error = mapFirebaseAuthError(errorCode);
                    
                    // Error should be displayable
                    expect(isErrorDisplayable(error)).toBe(true);
                    
                    // Error should have required properties
                    expect(typeof error.title).toBe('string');
                    expect(error.title.length).toBeGreaterThan(0);
                    
                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    it('Property 2: For any combination of invalid sign-up credentials, validation returns displayable error', () => {
        fc.assert(
            fc.property(
                fc.record({
                    email: fc.oneof(fc.constant(''), fc.emailAddress()),
                    password: fc.oneof(fc.constant(''), fc.string({ minLength: 1, maxLength: 20 })),
                    fullName: fc.oneof(fc.constant(''), fc.string({ minLength: 1, maxLength: 50 })),
                    businessName: fc.oneof(fc.constant(''), fc.string({ minLength: 1, maxLength: 50 })),
                    phone: fc.oneof(fc.constant(''), fc.string({ minLength: 1, maxLength: 20 })),
                }),
                (credentials: SignUpCredentials) => {
                    // This should not throw
                    const result = validateSignUpCredentials(credentials);
                    
                    // If any field is empty, should be invalid with displayable error
                    const hasEmptyField = !credentials.email || !credentials.password || 
                        !credentials.fullName || !credentials.businessName || !credentials.phone;
                    
                    if (hasEmptyField) {
                        expect(result.isValid).toBe(false);
                        expect(isErrorDisplayable(result.error)).toBe(true);
                    }
                    
                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });
});
