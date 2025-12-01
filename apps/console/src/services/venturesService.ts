import type { VenturesLoanStatus, VenturesFieldMapping, VenturesSyncLog, SyncMode } from '../types';

const API_URL = 'http://localhost:8000/api/v1/ventures';

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
    getDashboardStats: async () => {
        // This endpoint doesn't exist on backend yet, keep mock
        await new Promise(resolve => setTimeout(resolve, 600));
        return {
            synced: 142,
            pending: 12,
            errors: 5,
            recentLogs: []
        };
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
