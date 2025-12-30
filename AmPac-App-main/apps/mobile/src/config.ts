import { Platform } from 'react-native';

const getBaseUrl = () => {
    // Check for Brain API URL first (preferred)
    const brainUrl = process.env.EXPO_PUBLIC_BRAIN_API_URL;
    if (brainUrl) {
        return `${brainUrl.replace(/\/$/, '')}/api/v1`;
    }

    // Fallback to legacy API URL env var
    const envUrl = process.env.EXPO_PUBLIC_API_URL;
    if (envUrl) {
        return envUrl.replace(/\/$/, '');
    }

    // Local Development Fallbacks
    if (__DEV__) {
        if (Platform.OS === 'android') {
            return 'http://10.0.2.2:8001/api/v1';
        }
        return 'http://localhost:8001/api/v1';
    }

    // Production fallback - use hardcoded URL if env vars not available
    // This prevents crashes when env vars aren't properly injected during build
    console.warn('⚠️ Using fallback Brain API URL - env vars may not be configured');
    return 'https://ampac-brain-381306899120.us-central1.run.app/api/v1';
};

export const API_URL = getBaseUrl();

// Stripe Configuration
export const STRIPE_CONFIG = {
    publishableKey: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
    merchantIdentifier: 'merchant.com.ampac.business', // For Apple Pay
    urlScheme: 'ampac-business', // For redirects
};

// Payment Configuration
export const PAYMENT_CONFIG = {
    applicationFee: {
        defaultAmount: 5000, // $50.00 in cents
        maxAmount: 50000,    // $500.00 max
        currency: 'usd',
    },
    premiumSubscription: {
        monthlyPriceId: 'price_premium_monthly', // Replace with actual Stripe price ID
        yearlyPriceId: 'price_premium_yearly',   // Replace with actual Stripe price ID
    },
    successUrl: 'https://ampac-business.com/payment/success',
    cancelUrl: 'https://ampac-business.com/payment/cancel',
};
