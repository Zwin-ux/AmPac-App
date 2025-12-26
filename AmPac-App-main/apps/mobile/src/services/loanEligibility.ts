/**
 * Loan Eligibility Service
 * 
 * Handles loan amount routing and eligibility evaluation logic.
 * Extracted from ApplicationScreen for testability.
 */

export interface PreQualAnswers {
    isOwner: boolean | null;
    amount: string;
    years: string;
}

export interface EligibilityResult {
    eligible: boolean;
    productType: 'standard' | 'microloan' | 'alternative';
    issues: string[];
    suggestions: string[];
    step: 'eligible' | 'alternative' | 'ineligible';
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
export function evaluateEligibility(answers: PreQualAnswers): EligibilityResult {
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
    // Key principle: Always proceed unless there are actual blocking issues
    let step: 'eligible' | 'alternative' | 'ineligible';
    
    if (issues.length === 0) {
        step = 'eligible';
    } else if (suggestions.length > 0 && issues.length <= 1) {
        step = 'alternative'; // Alternative products available
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
