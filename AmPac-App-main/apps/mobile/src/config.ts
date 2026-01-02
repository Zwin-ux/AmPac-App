// Configuration for AmPac Mobile App
// Direct Stripe integration without Brain API dependency

// Stripe Configuration
export const STRIPE_CONFIG = {
    publishableKey: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_51ShfimE4qtfgmbNl8luZeGHcNWMuJ7XJYJvdnllszM0uFci2zJlOMVhvZeC7dSqaBrVH3Phc8UtDqYAlODNgJ3G300xwf5Te4m',
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

// Direct Stripe integration enabled for payment processing
// Uses Stripe Payment Links for secure checkout without backend dependency
