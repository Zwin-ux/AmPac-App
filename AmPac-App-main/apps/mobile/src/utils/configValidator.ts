/**
 * Configuration Validator
 * Validates that all required environment variables are loaded correctly
 */

export interface ConfigValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    config: {
        appEnv: string;
        brainApiUrl: string;
        brainApiKey: string;
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
    const brainApiUrl = process.env.EXPO_PUBLIC_BRAIN_API_URL || '';
    const brainApiKey = process.env.EXPO_PUBLIC_BRAIN_API_KEY || '';
    
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

    // Validate required environment variables
    if (!brainApiUrl) {
        errors.push('EXPO_PUBLIC_BRAIN_API_URL is missing');
    } else if (!brainApiUrl.startsWith('https://')) {
        errors.push('EXPO_PUBLIC_BRAIN_API_URL must use HTTPS');
    }

    if (!brainApiKey) {
        errors.push('EXPO_PUBLIC_BRAIN_API_KEY is missing - AI Brain API will not work');
    } else if (brainApiKey.length < 20) {
        warnings.push('EXPO_PUBLIC_BRAIN_API_KEY seems too short');
    }

    // Validate Firebase configuration
    const requiredFirebaseFields = [
        'apiKey', 'authDomain', 'projectId', 'storageBucket', 
        'messagingSenderId', 'appId'
    ];
    
    for (const field of requiredFirebaseFields) {
        if (!firebaseConfig[field as keyof typeof firebaseConfig]) {
            errors.push(`Firebase ${field} is missing`);
        }
    }

    if (!firebaseConfig.measurementId) {
        warnings.push('Firebase measurementId is missing - analytics may not work');
    }

    // Validate Stripe configuration
    if (!stripePublishableKey) {
        warnings.push('EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY is missing - payments will not work');
    } else if (!stripePublishableKey.startsWith('pk_')) {
        errors.push('EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY has invalid format');
    }

    // Validate Sentry configuration
    if (!sentryDsn) {
        warnings.push('EXPO_PUBLIC_SENTRY_DSN is missing - error tracking will not work');
    } else if (!sentryDsn.startsWith('https://')) {
        errors.push('EXPO_PUBLIC_SENTRY_DSN has invalid format');
    }

    // Environment-specific validations
    if (appEnv === 'production') {
        if (stripePublishableKey.includes('test')) {
            warnings.push('Using test Stripe key in production environment');
        }
        
        if (brainApiUrl.includes('localhost') || brainApiUrl.includes('127.0.0.1')) {
            errors.push('Using localhost Brain API URL in production');
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings,
        config: {
            appEnv,
            brainApiUrl,
            brainApiKey: brainApiKey ? `${brainApiKey.substring(0, 8)}...` : '', // Masked for security
            firebaseConfig,
            stripePublishableKey,
            sentryDsn,
        }
    };
};

export const logConfigurationStatus = (): void => {
    const validation = validateConfiguration();
    
    console.log('🔧 Configuration Validation Results:');
    console.log(`Environment: ${validation.config.appEnv}`);
    console.log(`Brain API URL: ${validation.config.brainApiUrl}`);
    console.log(`Brain API Key: ${validation.config.brainApiKey ? 'Set ✅' : 'Missing ❌'}`);
    console.log(`Firebase Project: ${validation.config.firebaseConfig.projectId}`);
    console.log(`Stripe Key: ${validation.config.stripePublishableKey ? 'Set ✅' : 'Missing ❌'}`);
    console.log(`Sentry DSN: ${validation.config.sentryDsn ? 'Set ✅' : 'Missing ❌'}`);
    
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