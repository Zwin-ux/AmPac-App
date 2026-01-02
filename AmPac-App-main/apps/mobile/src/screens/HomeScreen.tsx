import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Timestamp } from 'firebase/firestore';
import OfflineBanner from '../components/OfflineBanner';
import { userStore } from '../services/userStore';
import { applicationStore } from '../services/applicationStore';
import { theme } from '../theme';
import { User, Application } from '../types';
import { Card } from '../components/ui/Card';
import { LoanStatusTracker } from '../components/LoanStatusTracker';
import { globalCalendarService, GlobalEvent } from '../services/globalCalendarService';
import { format } from 'date-fns';
import { getFirstName, getInitial } from '../utils/nameUtils';
import { telemetryService } from '../services/telemetry';
import { mobileConfigService, MobileConfig } from '../services/mobileConfigService';

export default function HomeScreen() {
    const [user, setUser] = useState<User | null>(() => userStore.getCachedUser());
    const [activeApplication, setActiveApplication] = useState<Application | null>(null);
    const [upcomingEvents, setUpcomingEvents] = useState<GlobalEvent[]>([]);
    const [config, setConfig] = useState<MobileConfig | null>(null);
    const navigation = useNavigation<any>();

    // 1. Subscription & Hydration (Run once)
    useEffect(() => {
        const unsubscribeUser = userStore.subscribe(setUser);

        const unsubscribeConfig = mobileConfigService.subscribeToConfig(setConfig);

        const hydrate = async () => {
            await userStore.hydrateFromStorage();
            userStore.syncWithServer();
            await applicationStore.hydrateFromStorage();
            applicationStore.syncWithServer();

            // Load featured events
            const events = await globalCalendarService.getFeaturedEvents(3);
            setUpcomingEvents(events);
        };
        hydrate();
        telemetryService.track({ type: 'navigation', screen: 'Home' });

        return () => {
            unsubscribeUser();
            unsubscribeConfig();
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

    const userName = getFirstName(user?.fullName);
    const userInitial = getInitial(user?.fullName);
    const tools = [
        { label: 'Support & Concierge', icon: 'chatbox-ellipses', color: '#1565C0', background: '#E3F2FD', screen: 'Support', featureKey: 'support' },
        { label: 'Book Space', icon: 'business', color: '#2E7D32', background: '#E8F5E9', screen: 'Spaces', featureKey: 'spaces' },
        { label: 'Marketplace', icon: 'bag-handle', color: '#1F2937', background: '#F3F4F6', screen: 'Marketplace', featureKey: 'marketplace' },
        { label: 'Payments', icon: 'card', color: '#1565C0', background: '#E3F2FD', screen: 'Payment', featureKey: 'payments' },
        { label: 'My Calendar', icon: 'calendar', color: '#6366F1', background: '#EEF2FF', screen: 'Calendar', featureKey: 'calendar' },
        { label: 'Communities', icon: 'people-circle', color: '#E65100', background: '#FFF3E0', screen: 'Social', featureKey: 'social_hub' },
    ].filter(tool => {
        if (!config) return true; // Default to showing all while loading
        const key = tool.featureKey as keyof MobileConfig['features'];
        return config.features[key] !== false; // Only hide if explicitly false in config
    });

    return (
        <SafeAreaView style={styles.container}>
            <OfflineBanner />
            <View style={styles.header}>
                <View>
                    <Text style={styles.welcomeText}>Good afternoon, {userName}</Text>
                </View>
                <TouchableOpacity style={styles.profileButton} onPress={() => navigation.navigate('Profile')}>
                    <Text style={styles.profileButtonText}>{userInitial}</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Dynamic Announcements from Console */}
                {config?.announcements?.filter(a => a.active).map(announcement => (
                    <Card key={announcement.id} style={styles.announcementCard}>
                        <View style={styles.announcementHeader}>
                            <View style={styles.announcementIcon}>
                                <Ionicons name="megaphone" size={16} color="white" />
                            </View>
                            <Text style={styles.announcementTitle}>{announcement.title}</Text>
                        </View>
                        <Text style={styles.announcementMessage}>{announcement.message}</Text>
                    </Card>
                ))}

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
                                <Text style={styles.statValue}>
                                    {user.createdAt ? (
                                        user.createdAt instanceof Timestamp 
                                            ? user.createdAt.toDate().getFullYear() 
                                            : new Date(user.createdAt as any).getFullYear()
                                    ) : new Date().getFullYear()}
                                </Text>
                            </View>
                        </View>
                    </Card>
                ) : (
                    /* Combined Get Started Card - Apply + Eligibility */
                    <Card style={styles.startAppCard}>
                        <View style={styles.startAppContent}>
                            <View style={styles.startAppText}>
                                <Text style={styles.startAppTitle}>Get Funded</Text>
                                <Text style={styles.startAppDesc}>Apply for SBA 504 or Community Loans to grow your business.</Text>
                            </View>
                            <Ionicons name="rocket" size={48} color="rgba(255,255,255,0.2)" />
                        </View>
                        <View style={styles.startAppButtons}>
                            <TouchableOpacity
                                style={styles.primaryStartBtn}
                                onPress={() => navigation.navigate('Apply')}
                            >
                                <Ionicons name="document-text" size={18} color={theme.colors.primary} />
                                <Text style={styles.primaryStartBtnText}>Start Application</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.secondaryStartBtn}
                                onPress={() => navigation.navigate('PreliminaryIntake')}
                            >
                                <Ionicons name="speedometer" size={18} color="white" />
                                <Text style={styles.secondaryStartBtnText}>Quick Eligibility Check</Text>
                            </TouchableOpacity>
                        </View>
                    </Card>
                )}

                {/* --- UPCOMING EVENTS SECTION --- */}
                {upcomingEvents.length > 0 ? (
                    <View style={{ marginBottom: theme.spacing.lg }}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>UPCOMING EVENTS</Text>
                            <TouchableOpacity onPress={() => navigation.navigate('Calendar')}>
                                <Text style={styles.seeAllText}>See All</Text>
                            </TouchableOpacity>
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -theme.spacing.lg }}>
                            <View style={{ paddingHorizontal: theme.spacing.lg, flexDirection: 'row', gap: 12 }}>
                                {upcomingEvents.filter(event => event.startDate).map((event) => (
                                    <TouchableOpacity
                                        key={event.id}
                                        style={styles.eventCard}
                                        onPress={() => navigation.navigate('Calendar', { eventId: event.id })}
                                    >
                                        <View style={styles.eventDateBadge}>
                                            <Text style={styles.eventDateDay}>
                                                {format(event.startDate?.toDate?.() ?? new Date(), 'd')}
                                            </Text>
                                            <Text style={styles.eventDateMonth}>
                                                {format(event.startDate?.toDate?.() ?? new Date(), 'MMM')}
                                            </Text>
                                        </View>
                                        <View style={styles.eventInfo}>
                                            <Text style={styles.eventTitle} numberOfLines={2}>{event.title}</Text>
                                            <View style={styles.eventMeta}>
                                                <Ionicons name={event.isVirtual ? 'videocam' : 'location'} size={12} color={theme.colors.textSecondary} />
                                                <Text style={styles.eventLocation} numberOfLines={1}>
                                                    {event.isVirtual ? 'Virtual' : event.location || 'TBD'}
                                                </Text>
                                            </View>
                                            {event.isFeatured && (
                                                <View style={styles.featuredBadge}>
                                                    <Ionicons name="star" size={10} color="#FF9800" />
                                                    <Text style={styles.featuredText}>Featured</Text>
                                                </View>
                                            )}
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>
                    </View>
                ) : null}

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

                {/* Bottom padding */}
                <View style={{ height: 20 }} />
            </ScrollView>
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
    startAppButtons: {
        flexDirection: 'row',
        gap: 10,
    },
    primaryStartBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'white',
        paddingVertical: 14,
        paddingHorizontal: 12,
        borderRadius: 8,
        gap: 6,
    },
    primaryStartBtnText: {
        color: theme.colors.primary,
        fontWeight: 'bold',
        fontSize: 14,
    },
    secondaryStartBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingVertical: 14,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
        gap: 6,
    },
    secondaryStartBtnText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 13,
    },
    // Event Card Styles
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
        marginTop: theme.spacing.lg,
    },
    seeAllText: {
        color: theme.colors.primary,
        fontSize: 13,
        fontWeight: '600',
    },
    eventCard: {
        width: 200,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        padding: 12,
        flexDirection: 'row',
        gap: 12,
    },
    eventDateBadge: {
        width: 48,
        height: 48,
        backgroundColor: theme.colors.primary,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    eventDateDay: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    eventDateMonth: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    eventInfo: {
        flex: 1,
    },
    eventTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: 4,
    },
    eventMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    eventLocation: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        flex: 1,
    },
    featuredBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        marginTop: 4,
    },
    featuredText: {
        fontSize: 10,
        color: '#FF9800',
        fontWeight: '600',
    },
    // Announcement Styles
    announcementCard: {
        backgroundColor: '#FFFBEB',
        borderColor: '#FEF3C7',
        borderWidth: 1,
        marginBottom: theme.spacing.lg,
        padding: theme.spacing.md,
    },
    announcementHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 8,
    },
    announcementIcon: {
        backgroundColor: theme.colors.primary,
        padding: 4,
        borderRadius: 4,
    },
    announcementTitle: {
        ...theme.typography.h3 as any,
        fontSize: 14,
        color: theme.colors.primary,
    },
    announcementMessage: {
        ...theme.typography.caption as any,
        color: theme.colors.textSecondary,
    },
});
