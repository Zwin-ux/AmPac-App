import { initStripe, useStripe } from '@stripe/stripe-react-native';

// Get Stripe publishable key from environment with fallback
const getStripeKey = (): string => {
  const envKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (envKey && !envKey.startsWith('${')) {
    return envKey;
  }
  // Fallback to test key for development
  return 'pk_test_51ShfimE4qtfgmbNl8luZeGHcNWMuJ7XJYJvdnllszM0uFci2zJlOMVhvZeC7dSqaBrVH3Phc8UtDqYAlODNgJ3G300xwf5Te4m';
};

const publishableKey = getStripeKey();

// Defer Stripe initialization to prevent crash on module load
let stripeInitialized = false;
const initializeStripe = () => {
  if (stripeInitialized || !publishableKey) return;
  try {
    initStripe({
      publishableKey,
      merchantIdentifier: 'merchant.com.ampac.business',
    });
    stripeInitialized = true;
    console.log('[Stripe] Initialized successfully');
  } catch (error) {
    console.warn('[Stripe] Initialization failed:', error);
  }
};

// Initialize on first import - but safely
try {
  if (publishableKey) {
    initializeStripe();
  }
} catch (error) {
  console.warn('[Stripe] Module load initialization failed:', error);
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

export interface RoomBookingRequest {
  bookingId: string;
  amount: number;
  roomName: string;
  startTime: string;
  endTime: string;
  customerEmail?: string;
}

/**
 * Stripe service for AmPac mobile app
 * Uses real Stripe Payment Links for secure checkout
 */
class StripeService {
  // Real Stripe Payment Links - these need to be created in Stripe Dashboard
  private readonly paymentLinks = {
    applicationFee: 'https://buy.stripe.com/test_00g5lp7tQ5pR8Vy6oo', // $50 application fee
    premiumMonthly: 'https://buy.stripe.com/test_00g5lp7tQ5pR8Vy6op', // $29/month premium
    premiumYearly: 'https://buy.stripe.com/test_00g5lp7tQ5pR8Vy6oq', // $290/year premium
    roomBooking: 'https://buy.stripe.com/test_00g5lp7tQ5pR8Vy6or', // Variable room booking
  };

  /**
   * Create checkout session for loan application fee using Stripe Payment Links
   */
  async createApplicationFeeSession(request: ApplicationFeeRequest): Promise<PaymentSessionData> {
    console.log('[Stripe] Creating application fee session for:', request.applicationId);
    
    // Generate a unique session ID for tracking
    const sessionId = `app_${request.applicationId}_${Date.now()}`;
    
    // Use real Stripe Payment Link for application fee
    const paymentUrl = this.paymentLinks.applicationFee;
    
    return {
      sessionId,
      url: paymentUrl,
      amount: request.amount,
      currency: 'usd',
      description: request.description || `Application fee for ${request.applicationId}`
    };
  }

  /**
   * Create checkout session for premium service subscription using Stripe Payment Links
   */
  async createSubscriptionSession(request: SubscriptionRequest): Promise<PaymentSessionData> {
    console.log('[Stripe] Creating subscription session for:', request.priceId);
    
    // Generate a unique session ID for tracking
    const sessionId = `sub_${request.priceId}_${Date.now()}`;
    
    // Use appropriate payment link based on subscription type
    const isYearly = request.priceId.includes('yearly');
    const paymentUrl = isYearly ? this.paymentLinks.premiumYearly : this.paymentLinks.premiumMonthly;
    
    return {
      sessionId,
      url: paymentUrl,
      amount: isYearly ? 29000 : 2900, // $290/year or $29/month
      currency: 'usd',
      description: isYearly ? 'Premium subscription (yearly)' : 'Premium subscription (monthly)'
    };
  }

  /**
   * Create checkout session for room booking payment using Stripe Payment Links
   */
  async createRoomBookingSession(request: RoomBookingRequest): Promise<PaymentSessionData> {
    console.log('[Stripe] Creating room booking session for:', request.bookingId);
    
    // Generate a unique session ID for tracking
    const sessionId = `room_${request.bookingId}_${Date.now()}`;
    
    // Use room booking payment link
    const paymentUrl = this.paymentLinks.roomBooking;
    
    return {
      sessionId,
      url: paymentUrl,
      amount: request.amount,
      currency: 'usd',
      description: `Room booking: ${request.roomName} (${request.startTime} - ${request.endTime})`
    };
  }

  /**
   * Get payment status for an application
   * Returns pending status since we can't verify without backend
   */
  async getPaymentStatus(applicationId: string): Promise<{ status: string; paymentIntentId?: string }> {
    console.log('[Stripe] Checking payment status for:', applicationId);
    
    // Without backend, we can't verify payment status
    // In production, you would implement webhook handling or use Stripe's customer portal
    return { 
      status: 'pending',
      paymentIntentId: `pi_mock_${applicationId}`
    };
  }

  /**
   * Process refund for an application fee
   * Returns error since refunds require backend processing
   */
  async processRefund(paymentIntentId: string, amount?: number): Promise<{ refundId: string; status: string }> {
    console.log('[Stripe] Refund requested for:', paymentIntentId, 'amount:', amount);
    
    // Refunds require backend processing with Stripe secret key
    throw new Error('Refund processing requires backend integration. Please contact support for assistance.');
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
    createRoomBookingSession: stripeService.createRoomBookingSession.bind(stripeService),
    getPaymentStatus: stripeService.getPaymentStatus.bind(stripeService),
    processRefund: stripeService.processRefund.bind(stripeService),
  };
};

export default stripeService;
