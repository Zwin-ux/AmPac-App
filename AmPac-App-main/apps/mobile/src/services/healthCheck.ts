/**
 * API Health Check Service
 * Validates connectivity to Brain API and reports status
 */

import Constants from 'expo-constants';

const BRAIN_API_URL = process.env.EXPO_PUBLIC_BRAIN_API_URL || 'http://localhost:8000/api/v1';
const HEALTH_CHECK_TIMEOUT = 5000; // 5 seconds

export interface HealthStatus {
    status: 'healthy' | 'degraded' | 'unhealthy';
    latencyMs: number;
    timestamp: Date;
    details?: Record<string, unknown>;
    error?: string;
}

export interface SystemHealth {
    brainApi: HealthStatus;
    firebase: HealthStatus;
    overall: 'healthy' | 'degraded' | 'unhealthy';
}

/**
 * Check Brain API health
 */
export async function checkBrainHealth(): Promise<HealthStatus> {
    const start = Date.now();
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT);
        
        const headers: Record<string, string> = {};
        
        // Add Brain API key if available
        const brainApiKey = process.env.EXPO_PUBLIC_BRAIN_API_KEY;
        if (brainApiKey) {
            headers['X-API-Key'] = brainApiKey;
        }
        
        const response = await fetch(`${BRAIN_API_URL}/health`, {
            method: 'GET',
            headers,
            signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        const latencyMs = Date.now() - start;
        
        if (response.ok) {
            const data = await response.json();
            return {
                status: data.status === 'ok' ? 'healthy' : 'degraded',
                latencyMs,
                timestamp: new Date(),
                details: data,
            };
        }
        
        return {
            status: 'degraded',
            latencyMs,
            timestamp: new Date(),
            error: `HTTP ${response.status}`,
        };
    } catch (error) {
        const latencyMs = Date.now() - start;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        return {
            status: 'unhealthy',
            latencyMs,
            timestamp: new Date(),
            error: errorMessage.includes('aborted') ? 'Timeout' : errorMessage,
        };
    }
}

/**
 * Check Firebase connectivity (basic check)
 */
export async function checkFirebaseHealth(): Promise<HealthStatus> {
    const start = Date.now();
    
    try {
        // Import firebase dynamically to avoid circular deps
        const { db } = await import('../../firebaseConfig');
        const { collection, getDocs, limit, query } = await import('firebase/firestore');
        
        // Try to read a single doc from any collection
        const healthRef = collection(db, '_health_check');
        const q = query(healthRef, limit(1));
        await getDocs(q);
        
        const latencyMs = Date.now() - start;
        return {
            status: 'healthy',
            latencyMs,
            timestamp: new Date(),
        };
    } catch (error) {
        const latencyMs = Date.now() - start;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        // Permission denied is actually fine - it means Firebase is reachable
        if (errorMessage.includes('permission') || errorMessage.includes('PERMISSION_DENIED')) {
            return {
                status: 'healthy',
                latencyMs,
                timestamp: new Date(),
                details: { note: 'Firebase reachable (permission check)' },
            };
        }
        
        return {
            status: 'unhealthy',
            latencyMs,
            timestamp: new Date(),
            error: errorMessage,
        };
    }
}

/**
 * Run full system health check
 */
export async function checkSystemHealth(): Promise<SystemHealth> {
    const [brainApi, firebase] = await Promise.all([
        checkBrainHealth(),
        checkFirebaseHealth(),
    ]);
    
    // Determine overall status
    let overall: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (brainApi.status === 'unhealthy' || firebase.status === 'unhealthy') {
        overall = 'unhealthy';
    } else if (brainApi.status === 'degraded' || firebase.status === 'degraded') {
        overall = 'degraded';
    }
    
    return {
        brainApi,
        firebase,
        overall,
    };
}

/**
 * Get app version info
 */
export function getAppInfo() {
    return {
        version: Constants.expoConfig?.version || '1.0.0',
        buildNumber: Constants.expoConfig?.ios?.buildNumber || Constants.expoConfig?.android?.versionCode || '1',
        env: __DEV__ ? 'development' : 'production',
        brainApiUrl: BRAIN_API_URL,
    };
}
