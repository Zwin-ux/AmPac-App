/**
 * Health Check Service
 * Validates connectivity to Firebase and reports status
 * Brain API removed for v1 launch
 */

export interface HealthStatus {
    status: 'healthy' | 'degraded' | 'unhealthy';
    latencyMs: number;
    timestamp: Date;
    details?: Record<string, unknown>;
    error?: string;
}

export interface SystemHealth {
    firebase: HealthStatus;
    overall: 'healthy' | 'degraded' | 'unhealthy';
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
    const firebase = await checkFirebaseHealth();
    
    return {
        firebase,
        overall: firebase.status,
    };
}

/**
 * Get app version info
 */
export function getAppInfo() {
    return {
        version: '1.0.0',
        buildNumber: '29',
        env: __DEV__ ? 'development' : 'production',
    };
}
