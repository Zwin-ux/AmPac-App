// Mock service for Brain Expansion features

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
    // 1. IDP: Document Extraction
    extractDocument: async (file: File): Promise<ExtractionResult> => {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate processing

        // Mock response based on file name
        if (file.name.toLowerCase().includes('tax')) {
            return {
                extractionId: `ext_${Date.now()}`,
                status: 'completed',
                confidence: 0.98,
                data: {
                    formType: 'IRS 1040',
                    taxYear: 2023,
                    taxpayer: 'Rivera Innovations',
                    adjustedGrossIncome: 150000,
                    wages: 120000,
                    businessIncome: 30000,
                    totalTax: 24000
                }
            };
        } else {
            return {
                extractionId: `ext_${Date.now()}`,
                status: 'completed',
                confidence: 0.95,
                data: {
                    documentType: 'Bank Statement',
                    period: 'Oct 2023',
                    totalDeposits: 45000,
                    endingBalance: 12500,
                    averageDailyBalance: 8000
                }
            };
        }
    },

    // 2. Agents: Trigger Workflow
    triggerAgent: async (agentType: string, context: any): Promise<AgentWorkflow> => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return {
            workflowId: `wf_${Date.now()}`,
            status: 'started',
            logs: [`[${new Date().toISOString()}] Agent ${agentType} initialized`, `[${new Date().toISOString()}] Context loaded: ${JSON.stringify(context)}`],
            estimatedCompletion: new Date(Date.now() + 1000 * 60 * 5).toISOString()
        };
    },

    // 3. Knowledge: Query
    queryKnowledge: async (query: string): Promise<KnowledgeResult> => {
        await new Promise(resolve => setTimeout(resolve, 1500));

        if (query.toLowerCase().includes('dscr')) {
            return {
                answer: "The minimum **DSCR** for a gas station is generally **1.25x**. However, for SBA 504 loans, a global cash flow analysis is required.",
                citations: [
                    { source: "SBA SOP 50 10 7", section: "Chapter 3, Pg 145", text: "Debt Service Coverage Ratio (DSCR) must be..." },
                    { source: "AmPac Credit Policy", section: "Section 4.2", text: "Gas stations require 1.25x coverage." }
                ]
            };
        }

        return {
            answer: "I found some information related to your query in our internal knowledge base.",
            citations: [
                { source: "General Policy", section: "Intro", text: "AmPac aims to support small businesses..." }
            ]
        };
    }
};
