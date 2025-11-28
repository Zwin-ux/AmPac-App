import React, { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AssistantBubble from '../components/AssistantBubble';
import OfflineBanner from '../components/OfflineBanner';
import { userStore } from '../services/userStore';
import { theme } from '../theme';
import { User } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export default function HomeScreen() {
    const [user, setUser] = useState<User | null>(() => userStore.getCachedUser());
    const navigation = useNavigation<any>();

    useEffect(() => {
        const unsubscribe = userStore.subscribe(setUser);

        const hydrate = async () => {
            await userStore.hydrateFromStorage();
            userStore.syncWithServer();
        };
        hydrate();

        return unsubscribe;
    }, []);

    const userName = user?.fullName?.split(' ')[0] || 'Entrepreneur';

    return (
        <SafeAreaView style={styles.container}>
            <OfflineBanner />
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>AmPac</Text>
                    <Text style={styles.welcomeText}>Good afternoon, {userName}</Text>
                </View>
                <TouchableOpacity style={styles.profileButton} onPress={() => navigation.navigate('Profile')}>
                    <Text style={styles.profileButtonText}>{userName.charAt(0)}</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {user?.businessName && (
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
                )}

                <Text style={styles.sectionTitle}>Quick Actions</Text>

                <View style={styles.quickActionsGrid}>
                    <Card style={styles.actionCard}>
                        <TouchableOpacity onPress={() => navigation.navigate('Support')} style={styles.actionTouch}>
                            <View style={styles.iconContainer}>
                                <Ionicons name="chatbox-ellipses" size={20} color={theme.colors.text} />
                            </View>
                            <View>
                                <Text style={styles.actionTitle}>Support</Text>
                                <Text style={styles.actionDescription}>Talk to an expert</Text>
                            </View>
                        </TouchableOpacity>
                    </Card>

                    <Card style={styles.actionCard}>
                        <TouchableOpacity onPress={() => navigation.navigate('Spaces')} style={styles.actionTouch}>
                            <View style={styles.iconContainer}>
                                <Ionicons name="calendar" size={20} color={theme.colors.text} />
                            </View>
                            <View>
                                <Text style={styles.actionTitle}>Book Space</Text>
                                <Text style={styles.actionDescription}>Reserve a room</Text>
                            </View>
                        </TouchableOpacity>
                    </Card>

                    <Card style={styles.fullWidthCard}>
                        <TouchableOpacity onPress={() => navigation.navigate('Network')} style={styles.rowAction}>
                            <View style={styles.iconContainer}>
                                <Ionicons name="people" size={20} color={theme.colors.text} />
                            </View>
                            <View style={styles.rowContent}>
                                <Text style={styles.actionTitle}>Entrepreneur Ecosystem</Text>
                                <Text style={styles.actionDescription}>Connect with the community</Text>
                            </View>
                            <Ionicons name="arrow-forward" size={20} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                    </Card>
                </View>
            </ScrollView>
            <AssistantBubble context="home" />
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
        width: 40,
        height: 40,
        borderRadius: theme.borderRadius.md,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: theme.spacing.lg,
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
});
