import { API_URL } from '../config';

const BRAIN_API_URL = API_URL;

export interface WebsiteGenerationRequest {
    name: string;
    industry: string;
    zip: string;
    description: string;
    phone?: string;
    email?: string;
    hasBusinessPlan?: boolean;
    ownerName?: string;
}

export interface WebsiteGenerationResponse {
    html: string;
    sections: Record<string, any>;
}

export interface WebsitePublishRequest {
    businessId: string;
    ownerId: string;
    htmlContent: string;
    sections?: Record<string, any>;
}

export interface WebsitePublishResponse {
    url: string;
    status: string;
}

export interface SectionRegenerationRequest {
    sectionName: string;
    currentData: any;
    instruction: string;
    allSections: Record<string, any>;
}

export interface SectionRegenerationResponse {
    sectionData: any;
    html: string;
}

export const websiteService = {
    generateWebsite: async (data: WebsiteGenerationRequest): Promise<WebsiteGenerationResponse> => {
        try {
            console.log('Generating website with data:', data);
            const response = await fetch(`${BRAIN_API_URL}/website/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Generation failed: ${response.status} ${errorText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Website generation error:', error);
            throw error;
        }
    },

    regenerateSection: async (data: SectionRegenerationRequest): Promise<SectionRegenerationResponse> => {
        try {
            console.log('Regenerating section:', data.sectionName);
            const response = await fetch(`${BRAIN_API_URL}/website/regenerate-section`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Regeneration failed: ${response.status} ${errorText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Section regeneration error:', error);
            throw error;
        }
    },

    publishWebsite: async (data: WebsitePublishRequest): Promise<WebsitePublishResponse> => {
        try {
            console.log('Publishing website for:', data.businessId);
            const response = await fetch(`${BRAIN_API_URL}/website/publish`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Publishing failed: ${response.status} ${errorText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Website publishing error:', error);
            throw error;
        }
    }
};
