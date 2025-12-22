import { API_URL } from '../config';
import { getFirebaseIdToken } from './brainAuth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BRAIN_API_URL = API_URL;
const STRIPE_CACHE_KEY = 'ampac_stripe_customer';

// Check if Brain API is reachable
async function isBrainApiAvailable(): Promise<boolean> {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        // Try the root health endpoint
        const baseUrl = BRAIN_API_URL.replace('/api/v1', '');
        const response = await fetch(`${baseUrl}/health`, {
            method: 'GET',
            signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return response.ok;
    } catch (err) {
        // In dev mode, log the actual error for debugging
        if (__DEV__) {
            console.log('Brain API health check failed:', err);
        }
        return false;
    }
}

export interface StripeCustomer {
    id: string;
    email: string;
    name: string;
    metadata?: Record<string, string>;
    mock?: boolean;
}

export interface StripePaymentIntent {
    id: string;
    customer: string;
    amount: number;
    currency: string;
    status: string;
    client_secret?: string;
    created?: number;
    mock?: boolean;
}

export interface StripeSubscription {
    id: string;
    customer: string;
    items: Array<{ price: string }>;
    status: string;
    current_period_end?: number;
}

export interface StripeCheckoutSession {
    id: string;
    url: string;
}

export const stripeService = {
    createCustomer: async (email: string, name: string, metadata?: Record<string, string>): Promise<StripeCustomer> => {
        // Check cache first
        try {
            const cached = await AsyncStorage.getItem(STRIPE_CACHE_KEY);
            if (cached) {
                const customer = JSON.parse(cached);
                if (customer.email === email) {
                    return customer;
                }
            }
        } catch {}

        // Check if API is available
        const apiAvailable = await isBrainApiAvailable();
        
        if (!apiAvailable) {
            // Return mock customer for offline mode
            console.warn('Brain API unavailable - using offline mode for Stripe');
            const mockCustomer: StripeCustomer = {
                id: `cus_offline_${Date.now()}`,
                email,
                name,
                metadata,
                mock: true,
            };
            await AsyncStorage.setItem(STRIPE_CACHE_KEY, JSON.stringify(mockCustomer));
            return mockCustomer;
        }

        try {
            const token = await getFirebaseIdToken();
            const response = await fetch(`${BRAIN_API_URL}/stripe/customers`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ email, name, metadata }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to create customer: ${response.status} ${errorText}`);
            }

            const customer = await response.json();
            await AsyncStorage.setItem(STRIPE_CACHE_KEY, JSON.stringify(customer));
            return customer;
        } catch (error) {
            console.error('Stripe customer creation error:', error);
            
            // Fallback to mock on error
            const mockCustomer: StripeCustomer = {
                id: `cus_offline_${Date.now()}`,
                email,
                name,
                metadata,
                mock: true,
            };
            await AsyncStorage.setItem(STRIPE_CACHE_KEY, JSON.stringify(mockCustomer));
            return mockCustomer;
        }
    },

    createPaymentIntent: async (customerId: string, amount: number, currency: string = 'usd', metadata?: Record<string, string>): Promise<StripePaymentIntent> => {
        // Check if this is an offline customer
        if (customerId.startsWith('cus_offline_')) {
            return {
                id: `pi_offline_${Date.now()}`,
                customer: customerId,
                amount,
                currency,
                status: 'requires_payment_method',
                client_secret: `pi_offline_${Date.now()}_secret`,
                created: Math.floor(Date.now() / 1000),
                mock: true,
            };
        }

        const apiAvailable = await isBrainApiAvailable();
        if (!apiAvailable) {
            return {
                id: `pi_offline_${Date.now()}`,
                customer: customerId,
                amount,
                currency,
                status: 'requires_payment_method',
                client_secret: `pi_offline_${Date.now()}_secret`,
                created: Math.floor(Date.now() / 1000),
                mock: true,
            };
        }

        try {
            const token = await getFirebaseIdToken();
            const response = await fetch(`${BRAIN_API_URL}/stripe/payment-intents`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ customer_id: customerId, amount, currency, metadata }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to create payment intent: ${response.status} ${errorText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Stripe payment intent creation error:', error);
            throw error;
        }
    },

    createSubscription: async (customerId: string, priceId: string, metadata?: Record<string, string>): Promise<StripeSubscription> => {
        try {
            const token = await getFirebaseIdToken();
            const response = await fetch(`${BRAIN_API_URL}/stripe/subscriptions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ customer_id: customerId, price_id: priceId, metadata }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to create subscription: ${response.status} ${errorText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Stripe subscription creation error:', error);
            throw error;
        }
    },

    createCheckoutSession: async (priceId: string, customerId: string, successUrl: string, cancelUrl: string): Promise<StripeCheckoutSession> => {
        // Handle offline mode
        if (customerId.startsWith('cus_offline_')) {
            throw new Error('Payment processing unavailable offline. Please check your connection.');
        }

        try {
            const token = await getFirebaseIdToken();
            const response = await fetch(`${BRAIN_API_URL}/stripe/checkout-sessions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ price_id: priceId, customer_id: customerId, success_url: successUrl, cancel_url: cancelUrl }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to create checkout session: ${response.status} ${errorText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Stripe checkout session creation error:', error);
            throw error;
        }
    },

    listPaymentIntents: async (customerId: string): Promise<StripePaymentIntent[]> => {
        // Return empty for offline customers
        if (customerId.startsWith('cus_offline_')) {
            return [];
        }

        const apiAvailable = await isBrainApiAvailable();
        if (!apiAvailable) {
            return [];
        }

        try {
            const token = await getFirebaseIdToken();
            const response = await fetch(`${BRAIN_API_URL}/stripe/payment-intents/${customerId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to list payment intents: ${response.status} ${errorText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Stripe payment intents listing error:', error);
            return [];
        }
    },

    // Check if in offline/mock mode
    isOfflineMode: async (): Promise<boolean> => {
        const cached = await AsyncStorage.getItem(STRIPE_CACHE_KEY);
        if (cached) {
            const customer = JSON.parse(cached);
            return customer.mock === true;
        }
        return !(await isBrainApiAvailable());
    },

    // Clear cached customer (useful for logout)
    clearCache: async (): Promise<void> => {
        await AsyncStorage.removeItem(STRIPE_CACHE_KEY);
    },
};
