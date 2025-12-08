import React, { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import SmartActionBar from '../components/SmartActionBar';
import OfflineBanner from '../components/OfflineBanner';
import { userStore } from '../services/userStore';
import { applicationStore } from '../services/applicationStore';
import { theme } from '../theme';
import { User, Application } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { LoanStatusTracker } from '../components/LoanStatusTracker';

export default function HomeScreen() {
    const [user, setUser] = useState<User | null>(() => userStore.getCachedUser());
    const [activeApplication, setActiveApplication] = useState<Application | null>(null);
    const navigation = useNavigation<any>();

    // 1. Subscription & Hydration (Run once)
    useEffect(() => {
        const unsubscribeUser = userStore.subscribe(setUser);

        const hydrate = async () => {
            await userStore.hydrateFromStorage();
            userStore.syncWithServer();
            await applicationStore.hydrateFromStorage();
            applicationStore.syncWithServer();
        };
        hydrate();

        return () => {
            unsubscribeUser();
        };
    }, []);

    // 2. Subscribe to Applications (Real-time)
    useEffect(() => {
        let unsubscribe: (() => void) | undefined;

        const setupSubscription = async () => {
            if (user?.uid) {
                const { subscribeToApplications } = await import('../services/applications');
                unsubscribe = subscribeToApplications(user.uid, (apps) => {
                    const active = apps.find(a => a.status !== 'withdrawn' && a.status !== 'declined') || null;
                    setActiveApplication(active);
                });
            }
        };

        if (user?.uid) {
            setupSubscription();
        }

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [user?.uid]);

    const userName = user?.fullName?.split(' ')[0] || 'Entrepreneur';

    return (
        <SafeAreaView style={styles.container}>
            <OfflineBanner />
            <View style={styles.header}>
                <View>
                    <Image
                        source={require('../../assets/ampac_logo.png')}
                        style={{ width: 100, height: 30, marginBottom: 4 }}
                        resizeMode="contain"
                    />
                    <Text style={styles.welcomeText}>Good afternoon, {userName}</Text>
                </View>
                <TouchableOpacity style={styles.profileButton} onPress={() => navigation.navigate('Profile')}>
                    <Text style={styles.profileButtonText}>{userName.charAt(0)}</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Loan Status Tracker (Pizza Tracker) */}
                {activeApplication ? (
                    <View style={{ marginBottom: theme.spacing.xl }}>
                        <Text style={styles.sectionTitle}>LOAN STATUS</Text>
                        <LoanStatusTracker
                            status={activeApplication.status}
                            venturesStatus={activeApplication.venturesStatus}
                        />
                    </View>
                ) : (
                    user?.businessName && (
                        <Card style={styles.businessCard}>
                            <View style={styles.businessHeader}>
                                <Text style={styles.businessLabel}>YOUR BUSINESS</Text>
                                <Ionicons name="trending-up" size={20} color={theme.colors.accent} />
                            </View>
                            <Text style={styles.businessName}>{user.businessName}</Text>
                            <View style={styles.businessStats}>
                                <View>
                                    <Text style={styles.statLabel}>STATUS</Text>
                                    <Text style={styles.statValue}>Active</Text>
                                </View>
                                <View>
                                    <Text style={styles.statLabel}>MEMBER SINCE</Text>
                                    <Text style={styles.statValue}>2023</Text>
                                </View>
                            </View>
                        </Card>
                    )
                )}

                <Text style={styles.sectionTitle}>Tools & Services</Text>

                <View style={styles.quickActionsGrid}>
                    <TouchableOpacity
                        style={styles.actionCard}
                        onPress={() => navigation.navigate('Support')}
                    >
                        <View style={[styles.iconContainer, { backgroundColor: '#E3F2FD' }]}>
                            <Ionicons name="chatbox-ellipses" size={24} color="#1565C0" />
                        </View>
                        <Text style={styles.actionLabel}>Support</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionCard}
                        onPress={() => navigation.navigate('Spaces')}
                    >
                        <View style={[styles.iconContainer, { backgroundColor: '#E8F5E9' }]}>
                            <Ionicons name="calendar" size={24} color="#2E7D32" />
                        </View>
                        <Text style={styles.actionLabel}>Book Space</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionCard}
                        onPress={() => navigation.navigate('WebsiteBuilder')}
                    >
                        <View style={[styles.iconContainer, { backgroundColor: '#FFF3E0' }]}>
                            <Ionicons name="globe-outline" size={24} color="#EF6C00" />
                        </View>
                        <Text style={styles.actionLabel}>Web Builder</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionCard}
                        onPress={() => navigation.navigate('Network')}
                    >
                        <View style={[styles.iconContainer, { backgroundColor: '#F3E5F5' }]}>
                            <Ionicons name="people" size={24} color="#7B1FA2" />
                        </View>
                        <Text style={styles.actionLabel}>Network</Text>
                    </TouchableOpacity>
                </View>

                {/* Spacer for SmartActionBar */}
                <View style={{ height: 100 }} />
            </ScrollView>

            <SmartActionBar context="home" />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    scrollContent: {
        padding: theme.spacing.lg,
        paddingBottom: theme.spacing.xl * 2,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        backgroundColor: theme.colors.background,
    },
    headerTitle: {
        ...theme.typography.h3 as any, // Smaller, tighter
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    welcomeText: {
        ...theme.typography.caption as any,
        marginTop: 2,
    },
    profileButton: {
        width: 32,
        height: 32,
        borderRadius: theme.borderRadius.sm, // Square-ish
        backgroundColor: theme.colors.surfaceHighlight,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    profileButtonText: {
        ...theme.typography.label as any,
        color: theme.colors.text,
    },
    businessCard: {
        backgroundColor: theme.colors.primary,
        borderWidth: 0,
        marginBottom: theme.spacing.xl,
        padding: theme.spacing.xl, // More breathing room
        ...theme.shadows.float, // Floating effect
    },
    businessHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
    },
    businessLabel: {
        ...theme.typography.label as any,
        color: theme.colors.accent,
        letterSpacing: 1,
    },
    businessName: {
        ...theme.typography.display as any,
        fontSize: 28,
        color: '#FFFFFF',
        marginBottom: theme.spacing.xl,
    },
    businessStats: {
        flexDirection: 'row',
        gap: theme.spacing.xxl,
    },
    statLabel: {
        ...theme.typography.label as any,
        color: 'rgba(255, 255, 255, 0.5)',
        marginBottom: 4,
    },
    statValue: {
        ...theme.typography.h3 as any,
        color: '#FFFFFF',
        fontSize: 18,
    },
    sectionTitle: {
        ...theme.typography.label as any,
        marginBottom: theme.spacing.md,
        marginTop: theme.spacing.lg,
    },
    quickActionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: theme.spacing.md,
    },
    actionCard: {
        width: '48%', // Fixed width for 2 columns
        aspectRatio: 1.2, // Keep boxy shape for grid items
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
    },
    fullWidthCard: {
        width: '100%', // Full width
        aspectRatio: undefined, // Let content define height
        marginTop: theme.spacing.sm,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
    },
    actionIcon: {
        marginBottom: theme.spacing.sm,
    },
    actionLabel: {
        ...theme.typography.label as any,
        textAlign: 'center',
    },
    dashboardCard: {
        padding: theme.spacing.md,
        marginBottom: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.surface,
    },
    metricValue: {
        ...theme.typography.h1 as any,
        marginTop: theme.spacing.xs,
    },
    metricLabel: {
        ...theme.typography.caption as any,
    },
    fullWidth: {
        // Deprecated, use fullWidthCard
    },
    actionTouch: {
        padding: theme.spacing.lg,
        width: '100%',
        height: '100%',
        justifyContent: 'space-between',
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: theme.borderRadius.md,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surfaceHighlight,
    },
    actionTitle: {
        ...theme.typography.h3 as any,
        marginBottom: 4,
    },
    actionDescription: {
        ...theme.typography.caption as any,
    },
    rowAction: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: theme.spacing.lg,
    },
    rowContent: {
        flex: 1,
        marginLeft: theme.spacing.md,
    },
    horizontalScroll: {
        paddingHorizontal: theme.spacing.lg, // Align with header
        paddingBottom: theme.spacing.md,
        gap: theme.spacing.md,
    },
    horizontalCard: {
        width: 110,
        height: 110,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginRight: theme.spacing.md,
        ...theme.shadows.subtle,
    },
    horizontalTouch: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing.md,
    },
    horizontalTitle: {
        ...theme.typography.label as any,
        marginTop: theme.spacing.sm,
        textAlign: 'center',
        color: theme.colors.text,
    },
});
