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
    const tools = [
        { label: 'Support & Concierge', icon: 'chatbox-ellipses', color: '#1565C0', background: '#E3F2FD', screen: 'Support' },
        { label: 'Book Space', icon: 'calendar', color: '#2E7D32', background: '#E8F5E9', screen: 'Spaces' },
        { label: 'Payments', icon: 'card', color: '#1565C0', background: '#E3F2FD', screen: 'Payment' },
        { label: 'Marketplace', icon: 'bag-handle', color: '#1F2937', background: '#F3F4F6', screen: 'Marketplace' },
        { label: 'Network', icon: 'people', color: '#7B1FA2', background: '#F3E5F5', screen: 'Network' },
    ];

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
                ) : user?.businessName ? (
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
                ) : (
                    <Card style={styles.startAppCard}>
                        <View style={styles.startAppContent}>
                            <View style={styles.startAppText}>
                                <Text style={styles.startAppTitle}>Get Funded</Text>
                                <Text style={styles.startAppDesc}>Start your SBA 504 or Community Loan application in minutes.</Text>
                            </View>
                            <Ionicons name="rocket" size={48} color="rgba(255,255,255,0.2)" />
                        </View>
                        <Button 
                            title="Start Application" 
                            onPress={() => navigation.navigate('Apply')}
                            style={{ backgroundColor: 'white' }}
                            textStyle={{ color: theme.colors.primary, fontWeight: 'bold' }}
                        />
                    </Card>
                )}

                <Text style={styles.sectionTitle}>Tools & Services</Text>

                <View style={styles.toolsGrid}>
                    {tools.map((tool) => (
                        <TouchableOpacity
                            key={tool.label}
                            style={styles.toolCard}
                            onPress={() => navigation.navigate(tool.screen)}
                        >
                            <View style={[styles.toolIconContainer, { backgroundColor: tool.background }]}>
                                <Ionicons name={tool.icon as any} size={22} color={tool.color} />
                            </View>
                            <Text style={styles.toolLabel}>{tool.label}</Text>
                        </TouchableOpacity>
                    ))}
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
    toolsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    toolCard: {
        width: '31%', // 3 columns to reduce vertical scrolling
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.sm,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.lg,
        backgroundColor: theme.colors.surface,
        marginBottom: theme.spacing.md,
        alignItems: 'center',
        ...theme.shadows.subtle,
    },
    toolIconContainer: {
        width: 36,
        height: 36,
        borderRadius: theme.borderRadius.round,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    toolLabel: {
        ...theme.typography.caption as any,
        textAlign: 'center',
        color: theme.colors.text,
        marginTop: theme.spacing.sm,
    },
    startAppCard: {
        backgroundColor: theme.colors.primary,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.xl,
        borderRadius: theme.borderRadius.lg,
        ...theme.shadows.float,
    },
    startAppContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.lg,
    },
    startAppText: {
        flex: 1,
        marginRight: theme.spacing.md,
    },
    startAppTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 4,
    },
    startAppDesc: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.9)',
        lineHeight: 20,
    },
});
