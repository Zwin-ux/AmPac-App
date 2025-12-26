/**
 * Sentry Configuration for AmPac Mobile
 * 
 * To enable Sentry:
 * 1. Install: npx expo install @sentry/react-native
 * 2. Create a Sentry project at https://sentry.io
 * 3. Add EXPO_PUBLIC_SENTRY_DSN to your .env file
 * 4. For source maps, add SENTRY_AUTH_TOKEN to your EAS secrets
 */

import * as Sentry from '@sentry/react-native';

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

export const initSentry = () => {
    if (!SENTRY_DSN) {
        console.log('📊 Sentry DSN not configured, error reporting disabled');
        return;
    }

    try {
        Sentry.init({
            dsn: SENTRY_DSN,
            
            // Set environment
            environment: __DEV__ ? 'development' : 'production',
            
            // Enable performance monitoring
            tracesSampleRate: __DEV__ ? 1.0 : 0.2,
            
            // Only send errors in production
            enabled: !__DEV__,
            
            // Attach user info
            beforeSend(event: any) {
                // You can filter or modify events here
                return event;
            },
        });

        console.log('📊 Sentry initialized');
    } catch (error) {
        console.log('📊 Sentry initialization failed:', error);
    }
};

/**
 * Capture an exception with optional context
 */
export const captureException = (
    error: Error,
    context?: Record<string, any>
) => {
    if (!SENTRY_DSN) {
        console.error('Error:', error, context);
        return;
    }

    try {
        Sentry.withScope((scope: any) => {
            if (context) {
                scope.setExtras(context);
            }
            Sentry.captureException(error);
        });
    } catch (e) {
        console.error('Failed to capture exception:', e);
    }
};

/**
 * Capture a message for logging
 */
export const captureMessage = (
    message: string,
    level: 'info' | 'warning' | 'error' = 'info'
) => {
    if (!SENTRY_DSN) {
        console.log(`[${level}]`, message);
        return;
    }

    try {
        Sentry.captureMessage(message, level);
    } catch (e) {
        console.log(`[${level}]`, message);
    }
};

/**
 * Set user context for error tracking
 */
export const setUser = (user: { id: string; email?: string; username?: string } | null) => {
    if (!SENTRY_DSN) return;
    
    try {
        Sentry.setUser(user);
    } catch (e) {
        console.log('Failed to set Sentry user:', e);
    }
};

/**
 * Add breadcrumb for debugging
 */
export const addBreadcrumb = (
    message: string,
    category: string,
    data?: Record<string, any>
) => {
    if (!SENTRY_DSN) return;
    
    try {
        Sentry.addBreadcrumb({
            message,
            category,
            data,
            level: 'info',
        });
    } catch (e) {
        console.log('Failed to add breadcrumb:', e);
    }
};

export { Sentry };
