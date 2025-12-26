/**
 * Name Utilities Tests
 * Tests for extracting and formatting user names
 * 
 * Feature: app-store-deployment
 * Validates: Requirements 3.1 - Personalized greeting with first name
 */

import { getFirstName, getInitial } from './nameUtils';

describe('getFirstName', () => {
    // Task 4.1: Test personalized greeting displays correctly
    // Verify first name extraction from fullName
    
    describe('standard cases', () => {
        it('extracts first name from full name with two parts', () => {
            expect(getFirstName('John Doe')).toBe('John');
        });

        it('extracts first name from full name with multiple parts', () => {
            expect(getFirstName('Mary Jane Watson')).toBe('Mary');
        });

        it('returns single name when only one name provided', () => {
            expect(getFirstName('Jane')).toBe('Jane');
        });
    });

    describe('edge cases - no name', () => {
        it('returns default when fullName is undefined', () => {
            expect(getFirstName(undefined)).toBe('Entrepreneur');
        });

        it('returns default when fullName is null', () => {
            expect(getFirstName(null)).toBe('Entrepreneur');
        });

        it('returns default when fullName is empty string', () => {
            expect(getFirstName('')).toBe('Entrepreneur');
        });

        it('returns default when fullName is only whitespace', () => {
            expect(getFirstName('   ')).toBe('Entrepreneur');
        });
    });

    describe('edge cases - whitespace handling', () => {
        it('handles leading whitespace', () => {
            expect(getFirstName('  John Doe')).toBe('John');
        });

        it('handles trailing whitespace', () => {
            expect(getFirstName('John Doe  ')).toBe('John');
        });

        it('handles multiple spaces between names', () => {
            expect(getFirstName('John   Doe')).toBe('John');
        });
    });

    describe('custom default name', () => {
        it('uses custom default when provided and fullName is empty', () => {
            expect(getFirstName('', 'Guest')).toBe('Guest');
        });

        it('uses custom default when provided and fullName is undefined', () => {
            expect(getFirstName(undefined, 'User')).toBe('User');
        });
    });
});

describe('getInitial', () => {
    describe('standard cases', () => {
        it('returns first letter of first name', () => {
            expect(getInitial('John Doe')).toBe('J');
        });

        it('returns uppercase initial', () => {
            expect(getInitial('john doe')).toBe('J');
        });

        it('returns initial from single name', () => {
            expect(getInitial('Jane')).toBe('J');
        });
    });

    describe('edge cases', () => {
        it('returns default initial when fullName is undefined', () => {
            expect(getInitial(undefined)).toBe('E');
        });

        it('returns default initial when fullName is empty', () => {
            expect(getInitial('')).toBe('E');
        });

        it('uses custom default initial when provided', () => {
            expect(getInitial('', 'X')).toBe('X');
        });
    });
});
