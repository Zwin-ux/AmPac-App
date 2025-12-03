import { API_URL } from '../config';

export interface Message {
    id: string;
    threadId: string;
    senderRole: 'borrower' | 'staff';
    text: string;
    createdAt: string;
}

export interface Thread {
    id: string;
    borrowerId: string;
    staffId?: string;
    lastMessageAt: string;
    preview: string;
}

export const chatService = {
    getThreads: async (userId: string): Promise<Thread[]> => {
        try {
            const response = await fetch(`${API_URL}/chat/threads`, {
                headers: { 'X-User-ID': userId }
            });
            if (!response.ok) return [];
            return await response.json();
        } catch (e) {
            console.error("Error fetching threads:", e);
            return [];
        }
    },

    getMessages: async (threadId: string): Promise<Message[]> => {
        try {
            const response = await fetch(`${API_URL}/chat/threads/${threadId}/messages`);
            if (!response.ok) return [];
            return await response.json();
        } catch (e) {
            console.error("Error fetching messages:", e);
            return [];
        }
    },

    sendMessage: async (threadId: string, text: string): Promise<Message | null> => {
        try {
            const response = await fetch(`${API_URL}/chat/threads/${threadId}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, senderRole: 'borrower' })
            });
            if (!response.ok) return null;
            return await response.json();
        } catch (e) {
            console.error("Error sending message:", e);
            return null;
        }
    },

    createThread: async (userId: string): Promise<Thread | null> => {
        try {
            const response = await fetch(`${API_URL}/chat/threads`, {
                method: 'POST',
                headers: { 'X-User-ID': userId }
            });
            if (!response.ok) return null;
            return await response.json();
        } catch (e) {
            console.error("Error creating thread:", e);
            return null;
        }
    }
};
