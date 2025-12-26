/**
 * Property-Based Tests for Name Utilities
 * 
 * Feature: app-store-deployment, Property 4: Personalized Greeting Contains User Name
 * Validates: Requirements 3.1
 * 
 * Property: For any authenticated user with a fullName property, the home screen 
 * greeting SHALL contain the user's first name extracted from fullName.
 */

import * as fc from 'fast-check';
import { getFirstName, getInitial } from './nameUtils';

describe('Property Tests: Personalized Greeting', () => {
    /**
     * Property 4: Personalized Greeting Contains User Name
     * 
     * For any valid fullName string, the extracted first name should:
     * 1. Be contained in the original fullName (if fullName is non-empty)
     * 2. Be the first word of the fullName
     * 3. Never be empty when fullName has content
     */
    describe('Property 4: Personalized Greeting Contains User Name', () => {
        it('extracted first name is always contained in original fullName', () => {
            fc.assert(
                fc.property(
                    fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
                    (fullName) => {
                        const firstName = getFirstName(fullName);
                        // The first name should be contained in the original fullName
                        // (after trimming, since we trim the input)
                        return fullName.trim().includes(firstName) || firstName === 'Entrepreneur';
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('extracted first name equals first word of fullName', () => {
            fc.assert(
                fc.property(
                    // Generate names with at least one non-whitespace character
                    fc.array(fc.string({ minLength: 1 }).filter(s => s.trim().length > 0), { minLength: 1, maxLength: 5 })
                        .map(parts => parts.join(' ')),
                    (fullName) => {
                        const firstName = getFirstName(fullName);
                        const expectedFirstName = fullName.trim().split(' ')[0];
                        return firstName === expectedFirstName;
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('never returns empty string for non-empty fullName', () => {
            fc.assert(
                fc.property(
                    fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
                    (fullName) => {
                        const firstName = getFirstName(fullName);
                        return firstName.length > 0;
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('returns default for empty or whitespace-only fullName', () => {
            fc.assert(
                fc.property(
                    fc.constantFrom('', ' ', '  ', '\t', '\n', '   \t\n   '),
                    (emptyFullName) => {
                        const firstName = getFirstName(emptyFullName);
                        return firstName === 'Entrepreneur';
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('handles names with various formats consistently', () => {
            fc.assert(
                fc.property(
                    fc.record({
                        firstName: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0 && !s.includes(' ')),
                        lastName: fc.string({ minLength: 0, maxLength: 20 }).filter(s => !s.includes(' ')),
                        middleName: fc.option(fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0 && !s.includes(' ')))
                    }),
                    ({ firstName, lastName, middleName }) => {
                        // Build full name in various formats
                        const fullName = middleName 
                            ? `${firstName} ${middleName} ${lastName}`.trim()
                            : `${firstName} ${lastName}`.trim();
                        
                        const extracted = getFirstName(fullName);
                        return extracted === firstName;
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    describe('Property: Initial extraction correctness', () => {
        it('initial is always first character of first name (uppercased)', () => {
            fc.assert(
                fc.property(
                    fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
                    (fullName) => {
                        const initial = getInitial(fullName);
                        const firstName = getFirstName(fullName);
                        
                        if (firstName === 'Entrepreneur') {
                            return initial === 'E';
                        }
                        return initial === firstName.charAt(0).toUpperCase();
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('initial is always a single uppercase character', () => {
            fc.assert(
                fc.property(
                    fc.string(),
                    (fullName) => {
                        const initial = getInitial(fullName);
                        return initial.length === 1 && initial === initial.toUpperCase();
                    }
                ),
                { numRuns: 100 }
            );
        });
    });
});
