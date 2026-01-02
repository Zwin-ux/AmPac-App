/**
 * Configuration Validator
 * Validates that all required environment variables are loaded correctly
 * Brain API removed for v1 launch - Firebase only
 */

export interface ConfigValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    config: {
        appEnv: string;
        firebaseConfig: {
            apiKey: string;
            authDomain: string;
            projectId: string;
            storageBucket: string;
            messagingSenderId: string;
            appId: string;
            measurementId: string;
        };
        stripePublishableKey: string;
        sentryDsn: string;
    };
}

export const validateConfiguration = (): ConfigValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Get environment variables
    const appEnv = process.env.APP_ENV || 'unknown';
    
    const firebaseConfig = {
        apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
        authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
        projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
        storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
        messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
        appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
        measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || '',
    };
    
    const stripePublishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
    const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN || '';

    // Validate Firebase configuration
    const requiredFirebaseFields = [
        'apiKey', 'authDomain', 'projectId', 'storageBucket', 
        'messagingSenderId', 'appId'
    ];
    
    for (const field of requiredFirebaseFields) {
        const value = firebaseConfig[field as keyof typeof firebaseConfig];
        if (!value) {
            warnings.push(`Firebase ${field} is missing (will use fallback)`);
        } else if (value.startsWith('${')) {
            warnings.push(`Firebase ${field} has unsubstituted template variable (will use fallback)`);
        }
    }

    if (!firebaseConfig.measurementId) {
        warnings.push('Firebase measurementId is missing - analytics may not work');
    }

    // Validate Stripe configuration
    if (!stripePublishableKey) {
        warnings.push('EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY is missing (will use fallback)');
    } else if (stripePublishableKey.startsWith('${')) {
        warnings.push('Stripe key has unsubstituted template variable (will use fallback)');
    } else if (!stripePublishableKey.startsWith('pk_')) {
        errors.push('EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY has invalid format');
    }

    // Validate Sentry configuration
    if (!sentryDsn) {
        warnings.push('EXPO_PUBLIC_SENTRY_DSN is missing - error tracking will not work');
    } else if (sentryDsn.startsWith('${')) {
        warnings.push('Sentry DSN has unsubstituted template variable');
    } else if (!sentryDsn.startsWith('https://')) {
        errors.push('EXPO_PUBLIC_SENTRY_DSN has invalid format');
    }

    // Environment-specific validations
    if (appEnv === 'production') {
        if (stripePublishableKey.includes('test')) {
            warnings.push('Using test Stripe key in production environment');
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings,
        config: {
            appEnv,
            firebaseConfig,
            stripePublishableKey: stripePublishableKey ? 'Set' : 'Missing',
            sentryDsn: sentryDsn ? 'Set' : 'Missing',
        }
    };
};

export const logConfigurationStatus = (): void => {
    const validation = validateConfiguration();
    
    console.log('🔧 Configuration Validation Results:');
    console.log(`Environment: ${validation.config.appEnv}`);
    console.log(`Firebase Project: ${validation.config.firebaseConfig.projectId || '(using fallback)'}`);
    console.log(`Stripe Key: ${validation.config.stripePublishableKey}`);
    console.log(`Sentry DSN: ${validation.config.sentryDsn}`);
    
    if (validation.errors.length > 0) {
        console.error('❌ Configuration Errors:');
        validation.errors.forEach(error => console.error(`  - ${error}`));
    }
    
    if (validation.warnings.length > 0) {
        console.warn('⚠️  Configuration Warnings:');
        validation.warnings.forEach(warning => console.warn(`  - ${warning}`));
    }
    
    if (validation.isValid) {
        console.log('✅ Configuration is valid!');
    } else {
        console.error('❌ Configuration has errors that need to be fixed');
    }
};
