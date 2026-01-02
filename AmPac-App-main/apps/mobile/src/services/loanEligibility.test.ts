/**
 * Loan Eligibility Tests
 * Feature: app-store-deployment
 * 
 * Tests for loan amount routing and eligibility evaluation
 */

import * as fc from 'fast-check';
import {
    getLoanProductType,
    evaluateEligibility,
    evaluateEligibilitySync,
    hasActionableNextSteps,
    PreQualAnswers,
    EligibilityResult,
} from './loanEligibility';

describe('Loan Eligibility Service', () => {
    describe('getLoanProductType', () => {
        // Task 2.1: Test loan amount routing logic
        
        it('should route amounts < $5,000 to alternative', () => {
            expect(getLoanProductType(0)).toBe('alternative');
            expect(getLoanProductType(1000)).toBe('alternative');
            expect(getLoanProductType(4999)).toBe('alternative');
            expect(getLoanProductType(4999.99)).toBe('alternative');
        });

        it('should route amounts $5,000-$49,999 to microloan', () => {
            expect(getLoanProductType(5000)).toBe('microloan');
            expect(getLoanProductType(25000)).toBe('microloan');
            expect(getLoanProductType(49999)).toBe('microloan');
            expect(getLoanProductType(49999.99)).toBe('microloan');
        });

        it('should route amounts >= $50,000 to standard SBA flow', () => {
            expect(getLoanProductType(50000)).toBe('standard');
            expect(getLoanProductType(100000)).toBe('standard');
            expect(getLoanProductType(500000)).toBe('standard');
            expect(getLoanProductType(5000000)).toBe('standard');
        });
    });

    describe('evaluateEligibility (sync version)', () => {
        it('should return eligible for valid standard loan application', () => {
            const result = evaluateEligibilitySync({
                isOwner: true,
                amount: '100000',
                years: '3',
            });
            expect(result.eligible).toBe(true);
            expect(result.step).toBe('eligible');
            expect(result.productType).toBe('standard');
            expect(result.issues).toHaveLength(0);
        });

        it('should suggest alternatives for amounts < $5,000', () => {
            const result = evaluateEligibilitySync({
                isOwner: true,
                amount: '3000',
                years: '3',
            });
            expect(result.productType).toBe('alternative');
            expect(result.suggestions.length).toBeGreaterThan(0);
            expect(result.suggestions.some(s => s.includes('micro-grant') || s.includes('CDFI'))).toBe(true);
        });

        it('should suggest micro-loan for amounts $5,000-$49,999', () => {
            const result = evaluateEligibilitySync({
                isOwner: true,
                amount: '25000',
                years: '3',
            });
            expect(result.productType).toBe('microloan');
            expect(result.suggestions.length).toBeGreaterThan(0);
            expect(result.suggestions.some(s => s.includes('micro-loan'))).toBe(true);
        });

        it('should add issue for non-owner applicants', () => {
            const result = evaluateEligibilitySync({
                isOwner: false,
                amount: '100000',
                years: '3',
            });
            expect(result.issues.some(i => i.includes('business owner'))).toBe(true);
        });

        it('should add issue for amounts over $5,000,000', () => {
            const result = evaluateEligibilitySync({
                isOwner: true,
                amount: '6000000',
                years: '3',
            });
            expect(result.issues.some(i => i.includes('Maximum loan'))).toBe(true);
        });

        it('should suggest startup programs for businesses < 1 year old', () => {
            const result = evaluateEligibilitySync({
                isOwner: true,
                amount: '100000',
                years: '0.5',
            });
            expect(result.suggestions.some(s => s.includes('startup'))).toBe(true);
        });
    });

    describe('evaluateEligibility (async enhanced version)', () => {
        it('should return enhanced analysis when sufficient data provided', async () => {
            const result = await evaluateEligibility({
                isOwner: true,
                amount: '100000',
                years: '3',
                creditScore: 720,
                annualRevenue: 500000,
                industry: '541211', // CPA offices - low risk
                businessType: 'LLC',
                state: 'TX'
            });
            
            expect(result.eligible).toBe(true);
            expect(result.step).toBe('eligible');
            expect(result.productType).toBe('standard');
            expect(result.score).toBeDefined();
            expect(result.confidence).toBeDefined();
            expect(result.detailedAnalysis).toBeDefined();
        });

        it('should fall back to basic evaluation when enhanced data missing', async () => {
            const result = await evaluateEligibility({
                isOwner: true,
                amount: '100000',
                years: '3',
            });
            
            expect(result.eligible).toBe(true);
            expect(result.step).toBe('eligible');
            expect(result.productType).toBe('standard');
            expect(result.score).toBeUndefined();
            expect(result.confidence).toBeUndefined();
        });
    });

    describe('hasActionableNextSteps', () => {
        it('should return true for eligible results', () => {
            const result: EligibilityResult = {
                eligible: true,
                productType: 'standard',
                issues: [],
                suggestions: [],
                step: 'eligible',
            };
            expect(hasActionableNextSteps(result)).toBe(true);
        });

        it('should return true for alternative results with suggestions', () => {
            const result: EligibilityResult = {
                eligible: false,
                productType: 'microloan',
                issues: [],
                suggestions: ['Consider micro-loan program'],
                step: 'alternative',
            };
            expect(hasActionableNextSteps(result)).toBe(true);
        });

        it('should return true for ineligible results (support contact available)', () => {
            const result: EligibilityResult = {
                eligible: false,
                productType: 'alternative',
                issues: ['Not a business owner'],
                suggestions: [],
                step: 'ineligible',
            };
            // Even ineligible users have "Connect with Support" as next step
            expect(hasActionableNextSteps(result)).toBe(true);
        });
    });
});

/**
 * Property-Based Tests for Loan Eligibility
 * Feature: app-store-deployment
 */
describe('Property-Based Tests: Loan Amount Routing', () => {
    /**
     * Property 1: Loan Amount Routing Correctness
     * 
     * For any loan amount entered by a user, the eligibility evaluation SHALL route 
     * to the correct product type:
     * - Amount < $5,000 → alternative funding suggestions
     * - Amount $5,000-$49,999 → micro-loan alternatives
     * - Amount >= $50,000 → standard SBA loan flow
     * 
     * Validates: Requirements 2.3, 2.4, 2.5
     */
    it('Property 1: For any loan amount, routing returns correct product type', () => {
        fc.assert(
            fc.property(
                fc.float({ min: 0, max: 10000000, noNaN: true }),
                (amount) => {
                    const productType = getLoanProductType(amount);
                    
                    if (amount < 5000) {
                        expect(productType).toBe('alternative');
                    } else if (amount < 50000) {
                        expect(productType).toBe('microloan');
                    } else {
                        expect(productType).toBe('standard');
                    }
                    
                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    it('Property 1: For any valid pre-qual answers with amount, product type matches routing rules', () => {
        fc.assert(
            fc.property(
                fc.record({
                    isOwner: fc.boolean(),
                    amount: fc.float({ min: 1, max: 5000000, noNaN: true }).map(n => n.toFixed(2)),
                    years: fc.float({ min: 0.5, max: 50, noNaN: true }).map(n => n.toFixed(1)),
                }),
                (answers: PreQualAnswers) => {
                    const result = evaluateEligibilitySync(answers);
                    const amount = parseFloat(answers.amount);
                    
                    // Product type should match the routing rules
                    if (amount < 5000) {
                        expect(result.productType).toBe('alternative');
                    } else if (amount < 50000) {
                        expect(result.productType).toBe('microloan');
                    } else {
                        expect(result.productType).toBe('standard');
                    }
                    
                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });
});

describe('Property-Based Tests: Eligibility Next Steps', () => {
    /**
     * Property 3: Eligibility Always Offers Next Steps
     * 
     * For any eligibility evaluation result (eligible, alternative, or ineligible), 
     * the Mobile_App SHALL always provide at least one actionable next step 
     * (portal link, support contact, or alternative options).
     * 
     * Validates: Requirements 2.7, 2.8
     */
    it('Property 3: For any eligibility result, there is always an actionable next step', () => {
        fc.assert(
            fc.property(
                fc.record({
                    isOwner: fc.oneof(fc.constant(true), fc.constant(false)),
                    amount: fc.oneof(
                        fc.constant(''), // Empty
                        fc.float({ min: 0, max: 10000000, noNaN: true }).map(n => n.toFixed(2)),
                    ),
                    years: fc.oneof(
                        fc.constant(''), // Empty
                        fc.float({ min: 0, max: 100, noNaN: true }).map(n => n.toFixed(1)),
                    ),
                }),
                (answers: PreQualAnswers) => {
                    const result = evaluateEligibilitySync(answers);
                    
                    // Every result should have actionable next steps
                    expect(hasActionableNextSteps(result)).toBe(true);
                    
                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    it('Property 3: For any combination of valid inputs, no hard rejection without alternatives', () => {
        fc.assert(
            fc.property(
                fc.record({
                    isOwner: fc.boolean(),
                    amount: fc.float({ min: 1, max: 5000000, noNaN: true }).map(n => n.toFixed(2)),
                    years: fc.float({ min: Math.fround(0.1), max: 50, noNaN: true }).map(n => n.toFixed(1)),
                }),
                (answers: PreQualAnswers) => {
                    const result = evaluateEligibilitySync(answers);
                    
                    // If ineligible, should still have support contact as next step
                    // (hasActionableNextSteps returns true for all cases)
                    expect(hasActionableNextSteps(result)).toBe(true);
                    
                    // If there are suggestions, step should be 'alternative' or 'eligible'
                    if (result.suggestions.length > 0 && result.issues.length <= 1) {
                        expect(['eligible', 'alternative']).toContain(result.step);
                    }
                    
                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });
});
