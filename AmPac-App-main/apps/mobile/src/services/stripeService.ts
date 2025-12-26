import { initStripe, useStripe } from '@stripe/stripe-react-native';
import Constants from 'expo-constants';

// Initialize Stripe with publishable key
const publishableKey = Constants.expoConfig?.extra?.stripePublishableKey || 
                      process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;

if (publishableKey) {
  initStripe({
    publishableKey,
    merchantIdentifier: 'merchant.com.ampac.business', // For Apple Pay
  });
}

export interface PaymentSessionData {
  sessionId: string;
  url: string;
  amount: number;
  currency: string;
  description: string;
}

export interface ApplicationFeeRequest {
  applicationId: string;
  amount: number;
  description?: string;
  customerEmail?: string;
}

export interface SubscriptionRequest {
  customerId?: string;
  priceId: string;
  customerEmail?: string;
  customerName?: string;
}

/**
 * Stripe service for AmPac mobile app
 * Handles payment processing for loan applications and premium services
 */
class StripeService {
  private brainApiUrl: string;

  constructor() {
    this.brainApiUrl = Constants.expoConfig?.extra?.brainApiUrl || 
                      process.env.EXPO_PUBLIC_BRAIN_API_URL || 
                      'https://ampac-brain-381306899120.us-central1.run.app';
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // Add Brain API key if available
    const brainApiKey = Constants.expoConfig?.extra?.brainApiKey || 
                       process.env.EXPO_PUBLIC_BRAIN_API_KEY;
    if (brainApiKey) {
      headers['X-API-Key'] = brainApiKey;
    }
    
    return headers;
  }

  /**
   * Create checkout session for loan application fee
   */
  async createApplicationFeeSession(request: ApplicationFeeRequest): Promise<PaymentSessionData> {
    try {
      const response = await fetch(`${this.brainApiUrl}/api/v1/payments/create-application-fee-session`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`Payment session creation failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating application fee session:', error);
      throw error;
    }
  }

  /**
   * Create checkout session for premium service subscription
   */
  async createSubscriptionSession(request: SubscriptionRequest): Promise<PaymentSessionData> {
    try {
      const response = await fetch(`${this.brainApiUrl}/api/v1/payments/create-subscription-session`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`Subscription session creation failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating subscription session:', error);
      throw error;
    }
  }

  /**
   * Get payment status for an application
   */
  async getPaymentStatus(applicationId: string): Promise<{ status: string; paymentIntentId?: string }> {
    try {
      const response = await fetch(`${this.brainApiUrl}/api/v1/payments/status/${applicationId}`, {
        headers: this.getHeaders(),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get payment status: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting payment status:', error);
      throw error;
    }
  }

  /**
   * Process refund for an application fee
   */
  async processRefund(paymentIntentId: string, amount?: number): Promise<{ refundId: string; status: string }> {
    try {
      const response = await fetch(`${this.brainApiUrl}/api/v1/payments/refund`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          paymentIntentId,
          amount, // Optional partial refund amount in cents
        }),
      });

      if (!response.ok) {
        throw new Error(`Refund processing failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error processing refund:', error);
      throw error;
    }
  }
}

export const stripeService = new StripeService();

/**
 * Hook for using Stripe in React components
 */
export const useStripePayments = () => {
  const stripe = useStripe();

  const redirectToCheckout = async (sessionData: PaymentSessionData) => {
    if (!stripe) {
      throw new Error('Stripe not initialized');
    }

    // For React Native, we'll use WebView to redirect to Stripe Checkout
    // This is the recommended approach for mobile apps
    return {
      url: sessionData.url,
      sessionId: sessionData.sessionId,
    };
  };

  return {
    stripe,
    redirectToCheckout,
    createApplicationFeeSession: stripeService.createApplicationFeeSession.bind(stripeService),
    createSubscriptionSession: stripeService.createSubscriptionSession.bind(stripeService),
    getPaymentStatus: stripeService.getPaymentStatus.bind(stripeService),
    processRefund: stripeService.processRefund.bind(stripeService),
  };
};

export default stripeService;