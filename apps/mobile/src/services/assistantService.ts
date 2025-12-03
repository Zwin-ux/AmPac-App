import { API_URL } from '../config';

export interface AssistantResponse {
    response: string;
}

export const assistantService = {
    chat: async (context: string, query: string, userId?: string): Promise<string> => {
        try {
            const response = await fetch(`${API_URL}/assistant/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ context, query, userId })
            });

            if (!response.ok) {
                return "I'm having trouble connecting to my brain right now. Please try again later.";
            }

            const data: AssistantResponse = await response.json();
            return data.response;
        } catch (error) {
            console.error("Assistant Error:", error);
            return "I'm having trouble connecting to my brain right now. Please try again later.";
        }
    }
};
