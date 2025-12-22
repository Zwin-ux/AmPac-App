import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { stripeService } from '../services/stripeService';
import { auth } from '../../firebaseConfig';
import { WebView } from 'react-native-webview';

const primaryBlue = "#0064A6";

export default function PaymentScreen({ navigation }: any) {
    const [loading, setLoading] = useState(true);
    const [customer, setCustomer] = useState<any>(null);
    const [paymentIntents, setPaymentIntents] = useState<any[]>([]);
    const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
    const [creatingPayment, setCreatingPayment] = useState(false);
    const [isOffline, setIsOffline] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            try {
                const user = auth.currentUser;
                if (!user) {
                    Alert.alert("Error", "You must be logged in to view payments.");
                    navigation.goBack();
                    return;
                }

                // Create or get customer
                const customerData = await stripeService.createCustomer(
                    user.email || `${user.uid}@ampac.com`,
                    user.displayName || "AmPac User",
                    { user_id: user.uid }
                );
                setCustomer(customerData);
                setIsOffline(customerData.mock === true);

                // Load payment history (empty for offline)
                if (!customerData.mock) {
                    const intents = await stripeService.listPaymentIntents(customerData.id);
                    setPaymentIntents(intents);
                }

            } catch (error) {
                console.error('Error loading payment data:', error);
                // Don't show error for offline mode - just set offline state
                setIsOffline(true);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    const handleCreatePayment = async () => {
        if (isOffline || customer?.mock) {
            Alert.alert(
                "Offline Mode",
                "Payment processing is unavailable. Please ensure the Brain API is running and try again.",
                [{ text: "OK" }]
            );
            return;
        }

        try {
            setCreatingPayment(true);
            
            // Create a checkout session
            const session = await stripeService.createCheckoutSession(
                'price_123', // This would be a real price ID in production
                customer.id,
                'https://ampac.com/payment-success',
                'https://ampac.com/payment-cancel'
            );

            setCheckoutUrl(session.url);

        } catch (error: any) {
            console.error('Error creating payment:', error);
            Alert.alert("Error", error.message || "Failed to create payment.");
        } finally {
            setCreatingPayment(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const colors = {
            pending: { bg: '#FEF3C7', text: '#D97706' },
            succeeded: { bg: '#D1FAE5', text: '#065F46' },
            failed: { bg: '#FEE2E2', text: '#DC2626' },
            requires_payment_method: { bg: '#DBEAFE', text: '#1E40AF' }
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

    const formatAmount = (amount: number, currency: string) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency
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
                    <Text style={styles.title}>Payments</Text>
                    <Text style={styles.subtitle}>Manage your payments and subscriptions</Text>
                </View>

                {/* Offline Mode Banner */}
                {isOffline && (
                    <View style={styles.offlineBanner}>
                        <Ionicons name="cloud-offline" size={20} color="#D97706" />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={styles.offlineBannerTitle}>Offline Mode</Text>
                            <Text style={styles.offlineBannerText}>
                                Payment services unavailable. Some features are limited.
                            </Text>
                        </View>
                    </View>
                )}

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Customer Information</Text>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Name:</Text>
                        <Text style={styles.infoValue}>{customer?.name || 'N/A'}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Email:</Text>
                        <Text style={styles.infoValue}>{customer?.email || 'N/A'}</Text>
                    </View>
                    {!isOffline && (
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Customer ID:</Text>
                            <Text style={styles.infoValue}>{customer?.id || 'N/A'}</Text>
                        </View>
                    )}
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Payment History</Text>
                    {isOffline ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="cloud-offline-outline" size={40} color="#CBD5E1" />
                            <Text style={styles.emptyText}>Payment history unavailable offline</Text>
                        </View>
                    ) : paymentIntents.length > 0 ? (
                        paymentIntents.map((intent, index) => (
                            <View key={index} style={styles.paymentItem}>
                                <View style={styles.paymentHeader}>
                                    <Text style={styles.paymentId}>#{intent.id.slice(-8)}</Text>
                                    {getStatusBadge(intent.status)}
                                </View>
                                <View style={styles.paymentDetails}>
                                    <Text style={styles.paymentAmount}>
                                        {formatAmount(intent.amount, intent.currency)}
                                    </Text>
                                    <Text style={styles.paymentDate}>
                                        {new Date(intent.created * 1000).toLocaleDateString()}
                                    </Text>
                                </View>
                            </View>
                        ))
                    ) : (
                        <Text style={styles.emptyText}>No payment history found.</Text>
                    )}
                </View>

                <TouchableOpacity 
                    style={[styles.button, (creatingPayment || isOffline) && { opacity: 0.6 }]}
                    onPress={handleCreatePayment}
                    disabled={creatingPayment}
                >
                    {creatingPayment ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <>
                            <Text style={styles.buttonText}>
                                {isOffline ? 'Payment Unavailable' : 'Make a Payment'}
                            </Text>
                            <Ionicons 
                                name={isOffline ? 'cloud-offline' : 'card'} 
                                size={20} 
                                color="white" 
                                style={{ marginLeft: 8 }} 
                            />
                        </>
                    )}
                </TouchableOpacity>

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
    offlineBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF3C7',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#FCD34D',
    },
    offlineBannerTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#92400E',
        marginBottom: 2,
    },
    offlineBannerText: {
        fontSize: 12,
        color: '#B45309',
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
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0'
    },
    infoLabel: {
        fontSize: 14,
        color: '#64748B',
        fontWeight: '500'
    },
    infoValue: {
        fontSize: 14,
        color: '#1E293B',
        fontWeight: '600'
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 24,
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
        fontSize: 14,
        fontWeight: '600',
        color: '#334155'
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
        fontSize: 16,
        fontWeight: '700',
        color: '#1E293B'
    },
    paymentDate: {
        fontSize: 12,
        color: '#64748B'
    },
    emptyText: {
        textAlign: 'center',
        color: '#64748B',
        padding: 20,
        fontSize: 14
    },
    button: {
        backgroundColor: primaryBlue,
        padding: 18,
        borderRadius: 14,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: primaryBlue,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
        marginBottom: 20
    },
    buttonText: {
        color: 'white',
        fontSize: 18,
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