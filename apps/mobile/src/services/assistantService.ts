import { API_URL } from '../config';
import { getFirebaseIdToken } from './brainAuth';

export interface AssistantResponse {
    response: string;
}

export const assistantService = {
    chat: async (context: string, query: string): Promise<string> => {
        try {
            const token = await getFirebaseIdToken();
            const response = await fetch(`${API_URL}/assistant/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ context, query })
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
