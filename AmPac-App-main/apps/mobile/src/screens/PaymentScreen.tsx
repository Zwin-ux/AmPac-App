import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStripePayments } from '../services/stripeService';
import { auth } from '../../firebaseConfig';
import { WebView } from 'react-native-webview';
import PaymentButton from '../components/ui/PaymentButton';
import { PAYMENT_CONFIG } from '../config';

const primaryBlue = "#0064A6";

export default function PaymentScreen({ navigation }: any) {
    const [loading, setLoading] = useState(true);
    const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
    const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
    const [isOffline, setIsOffline] = useState(false);
    const { getPaymentStatus } = useStripePayments();

    const user = auth.currentUser;

    useEffect(() => {
        const loadData = async () => {
            try {
                if (!user) {
                    Alert.alert("Error", "You must be logged in to view payments.");
                    navigation.goBack();
                    return;
                }

                // For demo purposes, we'll show some mock payment history
                // In production, you'd fetch this from your backend
                setPaymentHistory([
                    {
                        id: 'app_001',
                        type: 'Application Fee',
                        amount: 5000,
                        status: 'paid',
                        date: new Date().toISOString(),
                        description: 'SBA 504 Loan Application Processing Fee'
                    }
                ]);

            } catch (error) {
                console.error('Error loading payment data:', error);
                setIsOffline(true);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    const handleApplicationFeePayment = () => {
        // This would typically be called from the ApplicationScreen
        // when a user needs to pay an application fee
        Alert.alert(
            "Application Fee",
            "This would normally be integrated into your loan application flow. For demo purposes, this shows how to collect application processing fees.",
            [{ text: "OK" }]
        );
    };

    const handlePremiumSubscription = () => {
        Alert.alert(
            "Premium Features",
            "Subscribe to premium features like expedited processing, priority support, and advanced analytics.",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Learn More", onPress: () => console.log("Show premium features") }
            ]
        );
    };

    const getStatusBadge = (status: string) => {
        const colors = {
            pending: { bg: '#FEF3C7', text: '#D97706' },
            paid: { bg: '#D1FAE5', text: '#065F46' },
            failed: { bg: '#FEE2E2', text: '#DC2626' },
            processing: { bg: '#DBEAFE', text: '#1E40AF' }
        };
        
        const color = colors[status as keyof typeof colors] || { bg: '#E5E7EB', text: '#374151' };
        
        return (
            <View style={[styles.statusBadge, { backgroundColor: color.bg }]}>
                <Text style={[styles.statusText, { color: color.text }]}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                </Text>
            </View>
        );
    };

    const formatAmount = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount / 100);
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={[styles.container, styles.center]}>
                    <ActivityIndicator size="large" color={primaryBlue} />
                    <Text style={styles.loadingText}>Loading payment data...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (checkoutUrl) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={{ flex: 1 }}>
                    <View style={styles.webviewHeader}>
                        <TouchableOpacity onPress={() => setCheckoutUrl(null)} style={styles.backButton}>
                            <Ionicons name="arrow-back" size={24} color="#333" />
                            <Text style={styles.backButtonText}>Back to Payments</Text>
                        </TouchableOpacity>
                    </View>
                    <WebView
                        source={{ uri: checkoutUrl }}
                        style={{ flex: 1 }}
                        originWhitelist={['*']}
                    />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
                    </TouchableOpacity>
                    <Text style={styles.title}>Payments & Billing</Text>
                    <Text style={styles.subtitle}>Manage your loan application fees and premium services</Text>
                </View>

                {/* Payment Options */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Payment Options</Text>
                    
                    <View style={styles.paymentOption}>
                        <View style={styles.paymentOptionHeader}>
                            <Ionicons name="document-text" size={24} color={primaryBlue} />
                            <View style={styles.paymentOptionInfo}>
                                <Text style={styles.paymentOptionTitle}>Application Processing Fee</Text>
                                <Text style={styles.paymentOptionDescription}>
                                    Pay the processing fee for your loan application
                                </Text>
                                <Text style={styles.paymentOptionAmount}>
                                    {formatAmount(PAYMENT_CONFIG.applicationFee.defaultAmount)}
                                </Text>
                            </View>
                        </View>
                        
                        <PaymentButton
                            type="application-fee"
                            applicationFeeData={{
                                applicationId: 'demo_app_001',
                                amount: PAYMENT_CONFIG.applicationFee.defaultAmount,
                                description: 'SBA 504 Loan Application Processing Fee',
                                customerEmail: user?.email || undefined
                            }}
                            onPaymentSuccess={(sessionId) => {
                                Alert.alert("Success", "Payment initiated successfully!");
                                console.log("Payment session:", sessionId);
                            }}
                            onPaymentError={(error) => {
                                Alert.alert("Error", error.message);
                            }}
                            style={styles.paymentButton}
                        />
                    </View>

                    <View style={styles.paymentOption}>
                        <View style={styles.paymentOptionHeader}>
                            <Ionicons name="star" size={24} color="#F59E0B" />
                            <View style={styles.paymentOptionInfo}>
                                <Text style={styles.paymentOptionTitle}>Premium Features</Text>
                                <Text style={styles.paymentOptionDescription}>
                                    Expedited processing, priority support, and advanced analytics
                                </Text>
                                <Text style={styles.paymentOptionAmount}>Starting at $29/month</Text>
                            </View>
                        </View>
                        
                        <PaymentButton
                            type="subscription"
                            subscriptionData={{
                                priceId: PAYMENT_CONFIG.premiumSubscription.monthlyPriceId,
                                customerEmail: user?.email || undefined,
                                customerName: user?.displayName || undefined
                            }}
                            onPaymentSuccess={(sessionId) => {
                                Alert.alert("Success", "Subscription setup initiated!");
                                console.log("Subscription session:", sessionId);
                            }}
                            onPaymentError={(error) => {
                                Alert.alert("Error", error.message);
                            }}
                            style={styles.paymentButton}
                        >
                            <Text style={styles.buttonText}>Subscribe to Premium</Text>
                        </PaymentButton>
                    </View>
                </View>

                {/* Payment History */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Payment History</Text>
                    {paymentHistory.length > 0 ? (
                        paymentHistory.map((payment, index) => (
                            <View key={index} style={styles.paymentItem}>
                                <View style={styles.paymentHeader}>
                                    <Text style={styles.paymentId}>{payment.type}</Text>
                                    {getStatusBadge(payment.status)}
                                </View>
                                <Text style={styles.paymentDescription}>{payment.description}</Text>
                                <View style={styles.paymentDetails}>
                                    <Text style={styles.paymentAmount}>
                                        {formatAmount(payment.amount)}
                                    </Text>
                                    <Text style={styles.paymentDate}>
                                        {new Date(payment.date).toLocaleDateString()}
                                    </Text>
                                </View>
                            </View>
                        ))
                    ) : (
                        <View style={styles.emptyState}>
                            <Ionicons name="receipt-outline" size={40} color="#CBD5E1" />
                            <Text style={styles.emptyText}>No payment history yet</Text>
                            <Text style={styles.emptySubtext}>
                                Your payment history will appear here after you make your first payment
                            </Text>
                        </View>
                    )}
                </View>

                <TouchableOpacity 
                    style={styles.secondaryButton}
                    onPress={() => navigation.navigate('Home')}
                >
                    <Text style={styles.secondaryButtonText}>Back to Home</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#F4F7FA'
    },
    container: {
        flex: 1,
        padding: 20
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center'
    },
    header: {
        marginBottom: 24
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        width: 120
    },
    backButtonText: {
        marginLeft: 8,
        fontSize: 16,
        color: '#333'
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1a1a1a',
        marginBottom: 8,
        letterSpacing: -0.5
    },
    subtitle: {
        fontSize: 16,
        color: '#64748B',
        lineHeight: 24
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1E293B',
        marginBottom: 16
    },
    paymentOption: {
        marginBottom: 24,
        padding: 16,
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    paymentOptionHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 12
    },
    paymentOptionInfo: {
        flex: 1,
        marginLeft: 12
    },
    paymentOptionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1E293B',
        marginBottom: 4
    },
    paymentOptionDescription: {
        fontSize: 14,
        color: '#64748B',
        marginBottom: 8,
        lineHeight: 20
    },
    paymentOptionAmount: {
        fontSize: 18,
        fontWeight: '700',
        color: primaryBlue
    },
    paymentButton: {
        marginTop: 8
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 32,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#64748B',
        marginTop: 12,
        marginBottom: 4
    },
    emptySubtext: {
        fontSize: 14,
        color: '#94A3B8',
        textAlign: 'center',
        lineHeight: 20
    },
    paymentItem: {
        padding: 16,
        borderRadius: 12,
        backgroundColor: '#F8FAFC',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    paymentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8
    },
    paymentId: {
        fontSize: 16,
        fontWeight: '600',
        color: '#334155'
    },
    paymentDescription: {
        fontSize: 14,
        color: '#64748B',
        marginBottom: 8
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'capitalize'
    },
    paymentDetails: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    paymentAmount: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1E293B'
    },
    paymentDate: {
        fontSize: 12,
        color: '#64748B'
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600'
    },
    secondaryButton: {
        backgroundColor: 'white',
        padding: 18,
        borderRadius: 14,
        width: '100%',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    secondaryButtonText: {
        color: '#334155',
        fontSize: 16,
        fontWeight: '600'
    },
    loadingText: {
        marginTop: 16,
        color: '#64748B',
        fontSize: 16
    },
    webviewHeader: {
        height: 60,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
        backgroundColor: 'white'
    }
});