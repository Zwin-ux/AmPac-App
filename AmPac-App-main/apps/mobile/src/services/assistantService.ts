import { API_URL } from '../config';
import { getFirebaseIdToken } from './brainAuth';
import { captureException, captureMessage, addBreadcrumb } from './sentry';

// Helper function to get API headers with authentication and API key
export const getApiHeaders = async (): Promise<Record<string, string>> => {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    
    // Add Firebase auth token
    try {
        const token = await getFirebaseIdToken();
        headers['Authorization'] = `Bearer ${token}`;
    } catch (error) {
        console.warn('Failed to get Firebase token:', error);
    }
    
    // Add Brain API key if available
    const brainApiKey = process.env.EXPO_PUBLIC_BRAIN_API_KEY;
    if (brainApiKey) {
        headers['X-API-Key'] = brainApiKey;
    }
    
    return headers;
};

export interface AssistantResponse {
    response: string;
}

// Smart fallback responses based on query context
function getFallbackResponse(query: string, context: string): string {
    const lowerQuery = query.toLowerCase();
    
    // Loan-related questions
    if (lowerQuery.includes('loan') || lowerQuery.includes('sba') || lowerQuery.includes('funding') || lowerQuery.includes('capital')) {
        return "I can help with loan questions! For SBA 504 loans, you typically need 10% down and the funds must be used for real estate or equipment. For SBA 7(a) loans, you can use funds for working capital, inventory, or business acquisition. Would you like to start an application?";
    }
    
    // Application process questions
    if (lowerQuery.includes('application') || lowerQuery.includes('apply') || lowerQuery.includes('process') || lowerQuery.includes('how to')) {
        return "The application process typically takes 2-4 weeks. You'll need tax returns, financial statements, and business documents. I can guide you through each step. Would you like to begin the pre-qualification process?";
    }
    
    // Document questions
    if (lowerQuery.includes('document') || lowerQuery.includes('paperwork') || lowerQuery.includes('requirements') || lowerQuery.includes('need')) {
        return "Required documents usually include: business tax returns (2-3 years), personal tax returns, profit & loss statements, balance sheet, and bank statements. The exact requirements depend on your loan type and amount. What type of loan are you considering?";
    }
    
    // Eligibility questions
    if (lowerQuery.includes('eligible') || lowerQuery.includes('qualify') || lowerQuery.includes('requirements') || lowerQuery.includes('credit')) {
        return "Eligibility depends on factors like time in business, credit score, cash flow, and collateral. Most SBA loans require at least 2 years in business and good credit. I can help you check your eligibility - what's your business situation?";
    }

    // Amount/pricing questions
    if (lowerQuery.includes('amount') || lowerQuery.includes('much') || lowerQuery.includes('cost') || lowerQuery.includes('rate')) {
        return "SBA loan amounts range from $50,000 to $5 million for most programs. Interest rates are typically prime + 2-4%. For smaller amounts under $50,000, we offer micro-loans with faster approval. What amount are you looking to borrow?";
    }

    // Timeline questions
    if (lowerQuery.includes('time') || lowerQuery.includes('long') || lowerQuery.includes('when') || lowerQuery.includes('fast')) {
        return "SBA loans typically take 30-90 days from application to funding. Our micro-loans can be approved in 1-2 weeks. The timeline depends on how quickly you provide documents and the complexity of your request. Ready to get started?";
    }
    
    // Default helpful response
    return "I'm here to help with your business funding questions! I can assist with loan applications, document requirements, eligibility criteria, and the approval process. What would you like to know about business financing?";
}

export const assistantService = {
    chat: async (context: string, query: string): Promise<string> => {
        try {
            // Add timeout to prevent hanging
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
            
            const headers = await getApiHeaders();
            
            const response = await fetch(`${API_URL}/assistant/chat`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ context, query }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                console.warn(`Assistant API returned ${response.status}, using fallback`);
                captureMessage(`Assistant API returned ${response.status}`, 'warning');
                addBreadcrumb('Assistant API error response', 'api', { status: response.status });
                return getFallbackResponse(query, context);
            }

            const data: AssistantResponse = await response.json();
            return data.response;
            
        } catch (error) {
            console.error("Assistant Error:", error);
            
            // Log connection failures to Sentry for monitoring (Requirement 7.6)
            const errorObj = error instanceof Error ? error : new Error(String(error));
            captureException(errorObj, {
                context,
                query,
                errorType: errorObj.name === 'AbortError' ? 'timeout' : 'connection_failure'
            });
            addBreadcrumb('Assistant API connection failure', 'api', {
                errorMessage: errorObj.message,
                context,
                queryLength: query.length
            });
            
            // Return contextual fallback responses instead of generic error
            return getFallbackResponse(query, context);
        }
    }
};
