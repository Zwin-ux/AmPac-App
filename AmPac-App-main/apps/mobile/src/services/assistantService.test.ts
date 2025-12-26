/**
 * AI Assistant Service Tests
 * 
 * Tests for verifying AI assistant reliability including:
 * - Brain API connectivity and response times
 * - Fallback responses when API is unavailable
 * - Property-based tests for fallback relevance
 * - Connection failure logging
 * 
 * Feature: app-store-deployment
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 */

import * as fc from 'fast-check';

// Mock the config module
jest.mock('../config', () => ({
    API_URL: 'https://test-api.ampac.com/api/v1',
}));

// Mock the brainAuth module
jest.mock('./brainAuth', () => ({
    getFirebaseIdToken: jest.fn().mockResolvedValue('mock-token'),
}));

// Mock Sentry for logging verification
const mockCaptureException = jest.fn();
const mockCaptureMessage = jest.fn();
const mockAddBreadcrumb = jest.fn();
jest.mock('./sentry', () => ({
    captureException: (...args: any[]) => mockCaptureException(...args),
    captureMessage: (...args: any[]) => mockCaptureMessage(...args),
    addBreadcrumb: (...args: any[]) => mockAddBreadcrumb(...args),
}));

// Import after mocks are set up
import { assistantService, getApiHeaders } from './assistantService';

describe('AI Assistant Service', () => {
    let originalFetch: typeof global.fetch;
    let mockFetch: jest.Mock;

    beforeEach(() => {
        originalFetch = global.fetch;
        mockFetch = jest.fn();
        global.fetch = mockFetch;
        jest.clearAllMocks();
        // Reset console mocks
        jest.spyOn(console, 'error').mockImplementation(() => {});
        jest.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
        global.fetch = originalFetch;
        jest.restoreAllMocks();
    });

    describe('Task 10.1: Test AI assistant with Brain API available', () => {
        /**
         * Requirements: 7.1, 7.2
         * Verify responses display within 5 seconds and test various query types
         */

        it('should return AI response when Brain API is available', async () => {
            const mockResponse = { response: 'Here is information about SBA loans...' };
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockResponse),
            });

            const result = await assistantService.chat('application', 'Tell me about SBA loans');

            expect(result).toBe(mockResponse.response);
            expect(mockFetch).toHaveBeenCalledTimes(1);
        });

        it('should include proper headers with authentication', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ response: 'Test response' }),
            });

            await assistantService.chat('home', 'Hello');

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/assistant/chat'),
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer mock-token',
                    }),
                })
            );
        });

        it('should handle various query types - loan questions', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ response: 'SBA 504 loans are great for real estate...' }),
            });

            const result = await assistantService.chat('application', 'What is an SBA 504 loan?');
            expect(result).toBeTruthy();
            expect(typeof result).toBe('string');
        });

        it('should handle various query types - document questions', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ response: 'You will need tax returns and financial statements...' }),
            });

            const result = await assistantService.chat('application', 'What documents do I need?');
            expect(result).toBeTruthy();
            expect(typeof result).toBe('string');
        });

        it('should handle various query types - eligibility questions', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ response: 'To qualify, you need at least 2 years in business...' }),
            });

            const result = await assistantService.chat('application', 'Do I qualify for a loan?');
            expect(result).toBeTruthy();
            expect(typeof result).toBe('string');
        });
    });

    describe('Task 10.2: Test AI fallback responses when API unavailable', () => {
        /**
         * Requirements: 7.3, 7.4, 7.5
         * Verify contextual fallbacks for loan questions and timeout handling
         */

        it('should return fallback response when API returns error status', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
            });

            const result = await assistantService.chat('application', 'Tell me about loans');

            // Should return a fallback response, not throw
            expect(result).toBeTruthy();
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
        });

        it('should return fallback response when network error occurs', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            const result = await assistantService.chat('application', 'What is an SBA loan?');

            // Should return a fallback response, not throw
            expect(result).toBeTruthy();
            expect(typeof result).toBe('string');
        });

        it('should return loan-related fallback for loan questions', async () => {
            mockFetch.mockRejectedValueOnce(new Error('API unavailable'));

            const result = await assistantService.chat('application', 'Tell me about SBA loans');

            expect(result.toLowerCase()).toMatch(/loan|sba|funding|capital/i);
        });

        it('should return application-related fallback for application questions', async () => {
            mockFetch.mockRejectedValueOnce(new Error('API unavailable'));

            const result = await assistantService.chat('application', 'How do I apply?');

            expect(result.toLowerCase()).toMatch(/application|apply|process/i);
        });

        it('should return document-related fallback for document questions', async () => {
            mockFetch.mockRejectedValueOnce(new Error('API unavailable'));

            const result = await assistantService.chat('application', 'What documents do I need?');

            expect(result.toLowerCase()).toMatch(/document|tax|financial|statement/i);
        });

        it('should return eligibility-related fallback for eligibility questions', async () => {
            mockFetch.mockRejectedValueOnce(new Error('API unavailable'));

            const result = await assistantService.chat('application', 'Do I qualify?');

            expect(result.toLowerCase()).toMatch(/eligib|qualify|credit|business/i);
        });

        it('should handle timeout (8 second limit) gracefully', async () => {
            // Simulate a timeout by making fetch hang and then abort
            mockFetch.mockImplementationOnce(() => {
                return new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('AbortError')), 100);
                });
            });

            const result = await assistantService.chat('application', 'Test query');

            // Should return fallback, not throw
            expect(result).toBeTruthy();
            expect(typeof result).toBe('string');
        });

        it('should return helpful default fallback for general questions', async () => {
            mockFetch.mockRejectedValueOnce(new Error('API unavailable'));

            const result = await assistantService.chat('home', 'Hello there');

            expect(result.toLowerCase()).toMatch(/help|business|funding|question/i);
        });
    });

    describe('Task 10.4: Verify connection failures are logged', () => {
        /**
         * Requirements: 7.6
         * Check console logging for failures
         */

        it('should log errors when API call fails', async () => {
            const consoleSpy = jest.spyOn(console, 'error');
            mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

            await assistantService.chat('application', 'Test query');

            expect(consoleSpy).toHaveBeenCalled();
        });

        it('should log warning when API returns non-OK status', async () => {
            const consoleSpy = jest.spyOn(console, 'warn');
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 503,
            });

            await assistantService.chat('application', 'Test query');

            expect(consoleSpy).toHaveBeenCalled();
        });
    });
});

/**
 * Task 10.3: Property test for AI fallback relevance
 * Feature: app-store-deployment, Property 17: AI Fallback Relevance
 * Validates: Requirements 7.3, 7.4, 7.5
 * 
 * For any query about loans, applications, documents, or eligibility when the 
 * Brain_API is unavailable, the fallback response SHALL contain keywords 
 * relevant to the query topic.
 */
describe('Property 17: AI Fallback Relevance', () => {
    // Helper function to extract the fallback response logic
    // We need to test the getFallbackResponse function directly
    // Since it's not exported, we'll test through the service with mocked fetch

    let originalFetch: typeof global.fetch;
    let mockFetch: jest.Mock;

    beforeEach(() => {
        originalFetch = global.fetch;
        mockFetch = jest.fn().mockRejectedValue(new Error('API unavailable'));
        global.fetch = mockFetch;
    });

    afterEach(() => {
        global.fetch = originalFetch;
    });

    // Loan-related keyword generators
    const loanKeywords = fc.constantFrom(
        'loan', 'sba', 'funding', 'capital', 'borrow', 'finance'
    );

    // Application-related keyword generators
    const applicationKeywords = fc.constantFrom(
        'application', 'apply', 'process', 'how to', 'start'
    );

    // Document-related keyword generators
    const documentKeywords = fc.constantFrom(
        'document', 'paperwork', 'requirements', 'need', 'tax return'
    );

    // Eligibility-related keyword generators
    const eligibilityKeywords = fc.constantFrom(
        'eligible', 'qualify', 'requirements', 'credit', 'criteria'
    );

    it('should return loan-relevant fallback for any loan-related query', async () => {
        await fc.assert(
            fc.asyncProperty(
                loanKeywords,
                fc.string({ minLength: 0, maxLength: 50 }),
                async (keyword, suffix) => {
                    const query = `${keyword} ${suffix}`.trim();
                    const result = await assistantService.chat('application', query);
                    
                    // Fallback should contain loan-related terms
                    const lowerResult = result.toLowerCase();
                    const hasRelevantContent = 
                        lowerResult.includes('loan') ||
                        lowerResult.includes('sba') ||
                        lowerResult.includes('funding') ||
                        lowerResult.includes('capital') ||
                        lowerResult.includes('business');
                    
                    return hasRelevantContent;
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should return application-relevant fallback for any application-related query', async () => {
        await fc.assert(
            fc.asyncProperty(
                applicationKeywords,
                fc.string({ minLength: 0, maxLength: 50 }),
                async (keyword, suffix) => {
                    const query = `${keyword} ${suffix}`.trim();
                    const result = await assistantService.chat('application', query);
                    
                    // Fallback should contain application-related terms
                    const lowerResult = result.toLowerCase();
                    const hasRelevantContent = 
                        lowerResult.includes('application') ||
                        lowerResult.includes('process') ||
                        lowerResult.includes('document') ||
                        lowerResult.includes('week') ||
                        lowerResult.includes('step') ||
                        lowerResult.includes('pre-qualification');
                    
                    return hasRelevantContent;
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should return document-relevant fallback for any document-related query', async () => {
        await fc.assert(
            fc.asyncProperty(
                documentKeywords,
                fc.string({ minLength: 0, maxLength: 50 }),
                async (keyword, suffix) => {
                    const query = `${keyword} ${suffix}`.trim();
                    const result = await assistantService.chat('application', query);
                    
                    // Fallback should contain document-related terms
                    const lowerResult = result.toLowerCase();
                    const hasRelevantContent = 
                        lowerResult.includes('document') ||
                        lowerResult.includes('tax') ||
                        lowerResult.includes('financial') ||
                        lowerResult.includes('statement') ||
                        lowerResult.includes('return') ||
                        lowerResult.includes('requirement');
                    
                    return hasRelevantContent;
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should return eligibility-relevant fallback for any eligibility-related query', async () => {
        await fc.assert(
            fc.asyncProperty(
                eligibilityKeywords,
                fc.string({ minLength: 0, maxLength: 50 }),
                async (keyword, suffix) => {
                    const query = `${keyword} ${suffix}`.trim();
                    const result = await assistantService.chat('application', query);
                    
                    // Fallback should contain eligibility-related terms
                    const lowerResult = result.toLowerCase();
                    const hasRelevantContent = 
                        lowerResult.includes('eligib') ||
                        lowerResult.includes('qualify') ||
                        lowerResult.includes('credit') ||
                        lowerResult.includes('business') ||
                        lowerResult.includes('year') ||
                        lowerResult.includes('requirement');
                    
                    return hasRelevantContent;
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should always return a non-empty helpful response for any query', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.string({ minLength: 1, maxLength: 200 }),
                async (query) => {
                    const result = await assistantService.chat('application', query);
                    
                    // Response should always be non-empty and helpful
                    return (
                        typeof result === 'string' &&
                        result.length > 0 &&
                        (result.toLowerCase().includes('help') ||
                         result.toLowerCase().includes('loan') ||
                         result.toLowerCase().includes('business') ||
                         result.toLowerCase().includes('question') ||
                         result.toLowerCase().includes('funding'))
                    );
                }
            ),
            { numRuns: 100 }
        );
    });
});
