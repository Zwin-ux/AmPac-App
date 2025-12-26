import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Linking } from 'react-native';
import { useStripePayments, ApplicationFeeRequest, SubscriptionRequest } from '../../services/stripeService';

interface PaymentButtonProps {
  type: 'application-fee' | 'subscription';
  applicationFeeData?: ApplicationFeeRequest;
  subscriptionData?: SubscriptionRequest;
  onPaymentSuccess?: (sessionId: string) => void;
  onPaymentError?: (error: Error) => void;
  disabled?: boolean;
  style?: any;
  children?: React.ReactNode;
}

export const PaymentButton: React.FC<PaymentButtonProps> = ({
  type,
  applicationFeeData,
  subscriptionData,
  onPaymentSuccess,
  onPaymentError,
  disabled = false,
  style,
  children,
}) => {
  const [loading, setLoading] = useState(false);
  const { createApplicationFeeSession, createSubscriptionSession } = useStripePayments();

  const handlePayment = async () => {
    if (loading || disabled) return;

    setLoading(true);

    try {
      let sessionData;

      if (type === 'application-fee' && applicationFeeData) {
        sessionData = await createApplicationFeeSession(applicationFeeData);
      } else if (type === 'subscription' && subscriptionData) {
        sessionData = await createSubscriptionSession(subscriptionData);
      } else {
        throw new Error('Invalid payment configuration');
      }

      // Open Stripe Checkout in browser
      const supported = await Linking.canOpenURL(sessionData.url);
      if (supported) {
        await Linking.openURL(sessionData.url);
        onPaymentSuccess?.(sessionData.sessionId);
      } else {
        throw new Error('Cannot open payment URL');
      }
    } catch (error) {
      console.error('Payment error:', error);
      Alert.alert(
        'Payment Error',
        error instanceof Error ? error.message : 'An unexpected error occurred',
        [{ text: 'OK' }]
      );
      onPaymentError?.(error instanceof Error ? error : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const getButtonText = () => {
    if (loading) return 'Processing...';
    
    if (type === 'application-fee') {
      const amount = applicationFeeData?.amount || 0;
      return `Pay Application Fee ($${(amount / 100).toFixed(2)})`;
    }
    
    return 'Subscribe to Premium';
  };

  return (
    <TouchableOpacity
      style={[styles.button, disabled && styles.disabled, style]}
      onPress={handlePayment}
      disabled={disabled || loading}
    >
      <View style={styles.buttonContent}>
        {children || <Text style={styles.buttonText}>{getButtonText()}</Text>}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#6366f1',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  disabled: {
    backgroundColor: '#9ca3af',
    opacity: 0.6,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PaymentButton;