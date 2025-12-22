/**
 * Sentry Configuration for AmPac Mobile
 * 
 * To enable Sentry:
 * 1. Install: npx expo install @sentry/react-native
 * 2. Create a Sentry project at https://sentry.io
 * 3. Add EXPO_PUBLIC_SENTRY_DSN to your .env file
 * 4. For source maps, add SENTRY_AUTH_TOKEN to your EAS secrets
 */

// Sentry is optional - check if it's installed
let Sentry: any = null;
try {
    Sentry = require('@sentry/react-native');
} catch (e) {
    console.log('📊 @sentry/react-native not installed, error reporting disabled');
}

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

export const initSentry = () => {
    if (!Sentry || !SENTRY_DSN) {
        console.log('📊 Sentry not configured, error reporting disabled');
        return;
    }

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
};

/**
 * Capture an exception with optional context
 */
export const captureException = (
    error: Error,
    context?: Record<string, any>
) => {
    if (!Sentry || !SENTRY_DSN) {
        console.error('Error:', error, context);
        return;
    }

    Sentry.withScope((scope: any) => {
        if (context) {
            scope.setExtras(context);
        }
        Sentry.captureException(error);
    });
};

/**
 * Capture a message for logging
 */
export const captureMessage = (
    message: string,
    level: 'info' | 'warning' | 'error' = 'info'
) => {
    if (!Sentry || !SENTRY_DSN) {
        console.log(`[${level}]`, message);
        return;
    }

    Sentry.captureMessage(message, level);
};

/**
 * Set user context for error tracking
 */
export const setUser = (user: { id: string; email?: string; username?: string } | null) => {
    if (!Sentry || !SENTRY_DSN) return;
    Sentry.setUser(user);
};

/**
 * Add breadcrumb for debugging
 */
export const addBreadcrumb = (
    message: string,
    category: string,
    data?: Record<string, any>
) => {
    if (!Sentry || !SENTRY_DSN) return;
    
    Sentry.addBreadcrumb({
        message,
        category,
        data,
        level: 'info',
    });
};

export { Sentry };
