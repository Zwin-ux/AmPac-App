/**
 * Brain API Service
 * Connects to the AmPac Brain FastAPI backend
 */

const BRAIN_API_URL = import.meta.env.VITE_BRAIN_API_URL || 'http://localhost:8000/api/v1';
const BRAIN_API_KEY = import.meta.env.VITE_BRAIN_API_KEY;

// Helper for making authenticated API requests
async function brainFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
    };
    
    if (BRAIN_API_KEY) {
        (headers as Record<string, string>)['X-API-Key'] = BRAIN_API_KEY;
    }
    
    const response = await fetch(`${BRAIN_API_URL}${endpoint}`, {
        ...options,
        headers,
    });
    
    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Brain API error: ${response.status} - ${error}`);
    }
    
    return response.json();
}

export interface ExtractionResult {
    extractionId: string;
    status: 'completed' | 'processing' | 'failed';
    data: any;
    confidence: number;
}

export interface AgentWorkflow {
    workflowId: string;
    status: 'started' | 'running' | 'completed' | 'failed';
    logs: string[];
    estimatedCompletion: string;
}

export interface KnowledgeResult {
    answer: string;
    citations: { source: string; section: string; text: string }[];
}

export const brainService = {
    // Check Brain API health
    checkHealth: async (): Promise<{ status: string; deps?: any }> => {
        try {
            return await brainFetch('/health');
        } catch {
            return { status: 'unhealthy' };
        }
    },

    // 1. IDP: Document Extraction
    extractDocument: async (file: File): Promise<ExtractionResult> => {
        const formData = new FormData();
        formData.append('file', file);
        
        try {
            return await brainFetch('/documents/extract', {
                method: 'POST',
                headers: {}, // Let browser set Content-Type for FormData
                body: formData,
            });
        } catch {
            // Fallback to mock if API fails
            console.warn('Brain API unavailable, using mock extraction');
            await new Promise(resolve => setTimeout(resolve, 1500));
            return {
                extractionId: `ext_${Date.now()}`,
                status: 'completed',
                confidence: 0.95,
                data: {
                    documentType: file.name.toLowerCase().includes('tax') ? 'Tax Return' : 'Bank Statement',
                    extracted: true,
                    mockData: true,
                }
            };
        }
    },

    // 2. Agents: Trigger Workflow
    triggerAgent: async (agentType: string, context: any): Promise<AgentWorkflow> => {
        try {
            return await brainFetch('/agents/trigger', {
                method: 'POST',
                body: JSON.stringify({ agentType, context }),
            });
        } catch {
            console.warn('Brain API unavailable, using mock agent');
            return {
                workflowId: `wf_${Date.now()}`,
                status: 'started',
                logs: [`[${new Date().toISOString()}] Agent ${agentType} initialized (mock)`],
                estimatedCompletion: new Date(Date.now() + 1000 * 60 * 5).toISOString()
            };
        }
    },

    // 3. Knowledge: Query
    queryKnowledge: async (query: string): Promise<KnowledgeResult> => {
        try {
            return await brainFetch('/knowledge/query', {
                method: 'POST',
                body: JSON.stringify({ query }),
            });
        } catch {
            console.warn('Brain API unavailable, using mock knowledge');
            return {
                answer: "I'm currently unable to access the knowledge base. Please try again later.",
                citations: []
            };
        }
    },

    // 4. M365: AI Assist
    draftEmail: async (appId: string, intent: 'approve' | 'request_docs' | 'follow_up', tone: string): Promise<{ subject: string; body: string }> => {
        try {
            return await brainFetch('/m365/draft-email', {
                method: 'POST',
                body: JSON.stringify({ appId, intent, tone }),
            });
        } catch {
            console.warn('Brain API unavailable, using mock email draft');
            return {
                subject: `Update regarding Application #${appId}`,
                body: `Dear Applicant,\n\nThis is a draft email generated locally.\n\nPlease review before sending.\n\nBest,\nAmPac Team`
            };
        }
    },

    proposeMeeting: async (borrowerEmail: string, staffEmails: string[], timeWindow: string): Promise<{ slots: string[]; draftBody: string }> => {
        try {
            return await brainFetch('/m365/propose-meeting', {
                method: 'POST',
                body: JSON.stringify({ borrowerEmail, staffEmails, timeWindow }),
            });
        } catch {
            console.warn('Brain API unavailable, using mock meeting proposal');
            return {
                slots: [
                    new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                    new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
                ],
                draftBody: "Hi,\n\nI'd like to propose a meeting.\n\nLet me know what works."
            };
        }
    },

    // Chat with Brain
    chat: async (message: string, context?: any): Promise<{ response: string; suggestions?: string[] }> => {
        try {
            return await brainFetch('/chat', {
                method: 'POST',
                body: JSON.stringify({ message, context }),
            });
        } catch {
            return {
                response: "I'm currently unable to process your request. Please try again later.",
                suggestions: []
            };
        }
    }
};
