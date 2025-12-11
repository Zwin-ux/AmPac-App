import { API_URL } from '../config';

const BRAIN_API_URL = API_URL;

export interface StripeCustomer {
    id: string;
    email: string;
    name: string;
    metadata?: Record<string, string>;
}

export interface StripePaymentIntent {
    id: string;
    customer: string;
    amount: number;
    currency: string;
    status: string;
    client_secret?: string;
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
        try {
            const response = await fetch(`${BRAIN_API_URL}/stripe/customers`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': BRAIN_API_KEY,
                },
                body: JSON.stringify({ email, name, metadata }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to create customer: ${response.status} ${errorText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Stripe customer creation error:', error);
            throw error;
        }
    },

    createPaymentIntent: async (customerId: string, amount: number, currency: string = 'usd', metadata?: Record<string, string>): Promise<StripePaymentIntent> => {
        try {
            const response = await fetch(`${BRAIN_API_URL}/stripe/payment-intents`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': BRAIN_API_KEY,
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
            const response = await fetch(`${BRAIN_API_URL}/stripe/subscriptions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': BRAIN_API_KEY,
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
        try {
            const response = await fetch(`${BRAIN_API_URL}/stripe/checkout-sessions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': BRAIN_API_KEY,
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
        try {
            const response = await fetch(`${BRAIN_API_URL}/stripe/payment-intents/${customerId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': BRAIN_API_KEY,
                },
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to list payment intents: ${response.status} ${errorText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Stripe payment intents listing error:', error);
            throw error;
        }
    }
};