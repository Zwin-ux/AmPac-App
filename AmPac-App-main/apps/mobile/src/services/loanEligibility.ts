/**
 * Loan Eligibility Service
 * 
 * Handles loan amount routing and eligibility evaluation logic.
 * Extracted from ApplicationScreen for testability.
 * 
 * Enhanced with EligibilityEngine integration for comprehensive scoring.
 */

import { eligibilityEngine, BusinessProfile, EligibilityScore } from './eligibilityEngine';
import { businessProfileAnalyzer } from './businessProfileAnalyzer';

export interface PreQualAnswers {
    isOwner: boolean | null;
    amount: string;
    years: string;
    // Enhanced fields for comprehensive evaluation
    creditScore?: number;
    annualRevenue?: number;
    industry?: string;
    businessType?: 'LLC' | 'Corporation' | 'Partnership' | 'Sole Proprietorship';
    state?: string;
}

export interface EligibilityResult {
    eligible: boolean;
    productType: 'standard' | 'microloan' | 'alternative';
    issues: string[];
    suggestions: string[];
    step: 'eligible' | 'alternative' | 'ineligible';
    // Enhanced fields
    score?: number;
    confidence?: number;
    detailedAnalysis?: EligibilityScore;
}

/**
 * Determines the product type based on loan amount.
 * 
 * Routing rules:
 * - Amount < $5,000 → 'alternative' (micro-grants, credit cards, CDFIs)
 * - Amount $5,000-$49,999 → 'microloan' (faster approval, less paperwork)
 * - Amount >= $50,000 → 'standard' (SBA 504/7a loans)
 * 
 * @param amount - The loan amount in dollars
 * @returns The product type for routing
 */
export function getLoanProductType(amount: number): 'standard' | 'microloan' | 'alternative' {
    if (amount < 5000) {
        return 'alternative';
    } else if (amount < 50000) {
        return 'microloan';
    } else {
        return 'standard';
    }
}

/**
 * Evaluates loan eligibility based on pre-qualification answers.
 * 
 * Enhanced version that integrates with EligibilityEngine for comprehensive scoring
 * when sufficient data is available, falls back to simple routing for basic pre-qual.
 * 
 * This function implements the business logic for determining:
 * 1. Whether the applicant is eligible for standard SBA loans
 * 2. What alternative products might be suitable
 * 3. What issues prevent eligibility
 * 
 * Key principle: Never show a hard rejection without offering next steps.
 * 
 * @param answers - The pre-qualification answers from the user
 * @returns The eligibility result with product type, issues, and suggestions
 */
export async function evaluateEligibility(answers: PreQualAnswers): Promise<EligibilityResult> {
    const issues: string[] = [];
    const suggestions: string[] = [];
    
    // Check business ownership
    if (answers.isOwner === false) {
        issues.push("Applications must be submitted by a business owner.");
    }

    // Parse and validate loan amount
    const amount = parseFloat(answers.amount || '0');
    if (!amount || isNaN(amount)) {
        issues.push("Enter an estimated loan amount in dollars.");
    } else {
        // Maximum loan amount check
        if (amount > 5000000) {
            issues.push("Maximum loan request is $5,000,000 for this program. Contact us for larger funding needs.");
        }
    }

    // Parse and validate years in business
    const years = parseFloat(answers.years || '0');
    if (!years || isNaN(years)) {
        issues.push("Tell us how many years the business has operated.");
    } else if (years < 1) {
        suggestions.push("New businesses may qualify for startup loan programs with different requirements.");
        suggestions.push("We also offer business plan development services for startups.");
    }

    // Enhanced evaluation if we have sufficient data
    let detailedAnalysis: EligibilityScore | undefined;
    let enhancedScore: number | undefined;
    let confidence: number | undefined;

    if (hasEnhancedData(answers)) {
        try {
            const businessProfile = createBusinessProfile(answers);
            detailedAnalysis = await eligibilityEngine.calculateScore(businessProfile);
            enhancedScore = detailedAnalysis.overallScore;
            confidence = detailedAnalysis.confidence;
            
            // Add enhanced suggestions based on detailed analysis
            suggestions.push(...detailedAnalysis.recommendations);
        } catch (error) {
            console.warn('Enhanced eligibility analysis failed, falling back to basic evaluation:', error);
        }
    }

    // Route to appropriate products based on amount and enhanced score
    const productType = determineProductType(amount, enhancedScore);
    
    // Add product-specific suggestions
    if (productType === 'alternative') {
        suggestions.push("Consider our micro-grant programs or business credit cards for smaller funding needs.");
        suggestions.push("We also partner with local CDFIs for very small business loans.");
    } else if (productType === 'microloan') {
        suggestions.push("You may qualify for our micro-loan program with faster approval times and less paperwork.");
        suggestions.push("Micro-loans typically have approval decisions within 1-2 weeks.");
    } else if (productType === 'standard' && enhancedScore && enhancedScore >= 70) {
        suggestions.push("Your profile shows strong eligibility for SBA loans with competitive rates.");
        suggestions.push("Consider both SBA 504 and 7(a) loan programs based on your funding needs.");
    }

    // Determine the outcome step
    // Key principle: Always proceed unless there are actual blocking issues
    let step: 'eligible' | 'alternative' | 'ineligible';
    
    if (issues.length === 0) {
        step = 'eligible';
    } else if (suggestions.length > 0 && issues.length <= 1) {
        step = 'alternative'; // Alternative products available
    } else {
        step = 'ineligible';
    }

    return {
        eligible: step === 'eligible',
        productType,
        issues,
        suggestions,
        step,
        score: enhancedScore,
        confidence,
        detailedAnalysis,
    };
}

/**
 * Enhanced product type determination using both amount and eligibility score
 */
function determineProductType(amount: number, enhancedScore?: number): 'standard' | 'microloan' | 'alternative' {
    // If we have enhanced scoring, use it to refine product routing
    if (enhancedScore !== undefined) {
        if (amount >= 50000 && enhancedScore >= 60) {
            return 'standard';
        } else if (amount >= 5000 && enhancedScore >= 40) {
            return 'microloan';
        } else {
            return 'alternative';
        }
    }
    
    // Fall back to simple amount-based routing
    return getLoanProductType(amount);
}

/**
 * Check if we have enough data for enhanced eligibility analysis
 */
function hasEnhancedData(answers: PreQualAnswers): boolean {
    return !!(
        answers.creditScore &&
        answers.annualRevenue &&
        answers.industry &&
        answers.businessType
    );
}

/**
 * Create a BusinessProfile from PreQualAnswers for enhanced analysis
 */
function createBusinessProfile(answers: PreQualAnswers): BusinessProfile {
    const now = new Date();
    const years = parseFloat(answers.years || '0');
    const amount = parseFloat(answers.amount || '0');
    
    // Get industry risk assessment
    const industryRisk = answers.industry ? 
        businessProfileAnalyzer.analyzeIndustryRisk(answers.industry, {
            yearsInBusiness: years,
            annualRevenue: answers.annualRevenue || 0,
            employeeCount: 5 // Default estimate
        }) : 50;
    
    const geographicRisk = answers.state ? 
        businessProfileAnalyzer.analyzeGeographicRisk(answers.state) : 50;
    
    return {
        userId: 'temp_user', // This would be the actual user ID in production
        businessInfo: {
            name: 'Business Name', // Would be collected separately
            industry: answers.industry || 'Unknown',
            yearsInBusiness: years,
            employeeCount: 5, // Default estimate
            annualRevenue: answers.annualRevenue || 0,
            businessType: answers.businessType || 'LLC'
        },
        financials: {
            creditScore: answers.creditScore || 650, // Default if not provided
            debtToIncomeRatio: 0.3, // Default estimate
            cashFlow: (answers.annualRevenue || 0) * 0.1, // Estimate 10% of revenue
            assets: (answers.annualRevenue || 0) * 0.5, // Estimate
            liabilities: (answers.annualRevenue || 0) * 0.2 // Estimate
        },
        loanRequest: {
            amount,
            purpose: 'Business expansion', // Default
            term: 120, // Default 10 years
            collateral: undefined
        },
        riskFactors: {
            industryRisk,
            geographicRisk,
            marketConditions: 50 // Default neutral
        },
        createdAt: now,
        updatedAt: now
    };
}

/**
 * Synchronous version of evaluateEligibility for backward compatibility
 * Uses basic routing logic without enhanced scoring
 */
export function evaluateEligibilitySync(answers: PreQualAnswers): EligibilityResult {
    const issues: string[] = [];
    const suggestions: string[] = [];
    
    // Check business ownership
    if (answers.isOwner === false) {
        issues.push("Applications must be submitted by a business owner.");
    }

    // Parse and validate loan amount
    const amount = parseFloat(answers.amount || '0');
    if (!amount || isNaN(amount)) {
        issues.push("Enter an estimated loan amount in dollars.");
    } else {
        // Route to appropriate products based on amount
        const productType = getLoanProductType(amount);
        
        if (productType === 'alternative') {
            suggestions.push("Consider our micro-grant programs or business credit cards for smaller funding needs.");
            suggestions.push("We also partner with local CDFIs for very small business loans.");
        } else if (productType === 'microloan') {
            suggestions.push("You may qualify for our micro-loan program with faster approval times and less paperwork.");
            suggestions.push("Micro-loans typically have approval decisions within 1-2 weeks.");
        }
        
        // Maximum loan amount check
        if (amount > 5000000) {
            issues.push("Maximum loan request is $5,000,000 for this program. Contact us for larger funding needs.");
        }
    }

    // Parse and validate years in business
    const years = parseFloat(answers.years || '0');
    if (!years || isNaN(years)) {
        issues.push("Tell us how many years the business has operated.");
    } else if (years < 1) {
        suggestions.push("New businesses may qualify for startup loan programs with different requirements.");
        suggestions.push("We also offer business plan development services for startups.");
    }

    // Determine the outcome step
    let step: 'eligible' | 'alternative' | 'ineligible';
    
    if (issues.length === 0) {
        step = 'eligible';
    } else if (suggestions.length > 0 && issues.length <= 1) {
        step = 'alternative';
    } else {
        step = 'ineligible';
    }

    // Determine product type for the result
    const parsedAmount = parseFloat(answers.amount || '0');
    const productType = (!parsedAmount || isNaN(parsedAmount)) 
        ? 'alternative' 
        : getLoanProductType(parsedAmount);

    return {
        eligible: step === 'eligible',
        productType,
        issues,
        suggestions,
        step,
    };
}

/**
 * Checks if an eligibility result provides actionable next steps.
 * 
 * Per requirements 2.7 and 2.8, the app should never show a hard rejection
 * without offering alternatives or support contact.
 * 
 * @param result - The eligibility evaluation result
 * @returns True if the result provides at least one actionable next step
 */
export function hasActionableNextSteps(result: EligibilityResult): boolean {
    // Eligible users have the portal link as their next step
    if (result.step === 'eligible') {
        return true;
    }
    
    // Alternative step always has suggestions and support contact
    if (result.step === 'alternative') {
        return result.suggestions.length > 0;
    }
    
    // Ineligible step should still offer support contact
    // The UI always shows "Connect with Support" button for ineligible users
    // So even with no suggestions, there's always a next step
    return true;
}
