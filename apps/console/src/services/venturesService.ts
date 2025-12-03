import type { VenturesLoanStatus, VenturesSyncLog, SyncMode, VenturesDashboardStats } from '../types';
import { API_URL as BASE_API_URL } from '../config';

const API_URL = `${BASE_API_URL}/ventures`;

export const venturesService = {
    // Get current status and field mappings
    getLoanStatus: async (loanId: string): Promise<VenturesLoanStatus> => {
        try {
            const response = await fetch(`${API_URL}/status/${loanId}`);
            if (!response.ok) throw new Error('Failed to fetch Ventures status');
            return await response.json();
        } catch (error) {
            console.error(error);
            // Fallback to mock if API fails (for demo purposes)
            return {
                venturesLoanId: `v-${loanId.substring(0, 5)}`,
                lastSync: Date.now(),
                status: 'disconnected',
                fieldMappings: [],
                syncLogs: []
            };
        }
    },

    // Execute a sync operation
    syncLoan: async (loanId: string, mode: SyncMode, note?: string): Promise<{ success: boolean; log: VenturesSyncLog }> => {
        try {
            const response = await fetch(`${API_URL}/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ loanId, mode, note })
            });

            if (!response.ok) throw new Error('Sync failed');
            return await response.json();
        } catch (error) {
            console.error(error);
            throw error;
        }
    },

    // Get global dashboard stats
    getDashboardStats: async (): Promise<VenturesDashboardStats> => {
        try {
            const response = await fetch(`${API_URL}/dashboard`);
            if (!response.ok) throw new Error('Failed to fetch dashboard stats');
            return await response.json();
        } catch (error) {
            console.error(error);
            throw error;
        }
    },

    // Configure credentials
    configure: async (username: string, password: string, siteName: string) => {
        const response = await fetch(`${API_URL}/configure`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, site_name: siteName })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || 'Configuration failed');
        }
        return await response.json();
    },

    // Check configuration status
    getConfigStatus: async () => {
        try {
            const response = await fetch(`${API_URL}/config/status`);
            if (!response.ok) return { configured: false };
            return await response.json();
        } catch (e) {
            return { configured: false };
        }
    }
};
