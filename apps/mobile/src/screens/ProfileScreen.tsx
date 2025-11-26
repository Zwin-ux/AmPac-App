import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { auth } from '../../firebaseConfig';
import { signOut } from 'firebase/auth';
import { getCurrentUserDoc } from '../services/firestore';
import { User } from '../types';
import { theme } from '../theme';
import { SafeAreaView } from 'react-native-safe-area-context';

import { cacheService } from '../services/cache';

const CACHE_KEY_PROFILE = 'cache_user_profile';

export default function ProfileScreen() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                // Try cache first
                const cached = await cacheService.get<User>(CACHE_KEY_PROFILE);
                if (cached) {
                    setUser(cached);
                    setLoading(false);
                }

                if (auth.currentUser) {
                    const userData = await getCurrentUserDoc(auth.currentUser.uid);
                    setUser(userData);
                    await cacheService.set(CACHE_KEY_PROFILE, userData);
                } else {
                    // Mock user for dev mode
                    const mockUser = {
                        uid: 'dev-user',
                        email: 'dev@ampac.com',
                        fullName: 'Test Entrepreneur',
                        businessName: 'Dev Business Inc.',
                        role: 'entrepreneur',
                        createdAt: '2023-01-01',
                        phone: '555-0123'
                    } as User;
                    setUser(mockUser);
                    await cacheService.set(CACHE_KEY_PROFILE, mockUser);
                }
            } catch (error) {
                console.error("Error fetching user:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchUser();
    }, []);

    const handleSignOut = async () => {
        try {
            await cacheService.clear(); // Clear cache on sign out
            await signOut(auth);
        } catch (error) {
            console.error("Error signing out:", error);
        }
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.title}>Profile</Text>

                <View style={styles.card}>
                    <View style={styles.headerRow}>
                        <Text style={styles.sectionTitle}>Personal Info</Text>
                        <TouchableOpacity onPress={() => alert('Edit Profile')}>
                            <Text style={styles.editLink}>Edit</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.infoRow}>
                        <Text style={styles.label}>Full Name</Text>
                        <Text style={styles.value}>{user?.fullName || 'N/A'}</Text>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.infoRow}>
                        <Text style={styles.label}>Business Name</Text>
                        <Text style={styles.value}>{user?.businessName || 'N/A'}</Text>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.infoRow}>
                        <Text style={styles.label}>Email</Text>
                        <Text style={styles.value}>{auth.currentUser?.email || user?.email || 'N/A'}</Text>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.infoRow}>
                        <Text style={styles.label}>Phone</Text>
                        <Text style={styles.value}>{user?.phone || 'N/A'}</Text>
                    </View>
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Settings</Text>
                    <View style={[styles.infoRow, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }]}>
                        <Text style={styles.value}>Push Notifications</Text>
                        <TouchableOpacity
                            onPress={() => setNotificationsEnabled(!notificationsEnabled)}
                            style={[styles.toggle, notificationsEnabled && styles.toggleActive]}
                        >
                            <View style={[styles.toggleKnob, notificationsEnabled && styles.toggleKnobActive]} />
                        </TouchableOpacity>
                    </View>
                </View>

                <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
                    <Text style={styles.signOutText}>Sign Out</Text>
                </TouchableOpacity>
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
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
    },
    title: {
        ...theme.typography.h1,
        marginBottom: theme.spacing.xl,
        marginTop: theme.spacing.md,
    },
    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.xl,
        ...theme.shadows.card,
    },
    infoRow: {
        marginBottom: theme.spacing.sm,
    },
    label: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: 4,
    },
    value: {
        fontSize: 18,
        color: theme.colors.text,
        fontWeight: '500',
    },
    divider: {
        height: 1,
        backgroundColor: theme.colors.border,
        marginVertical: theme.spacing.md,
    },
    signOutButton: {
        borderWidth: 1,
        borderColor: theme.colors.error,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    signOutText: {
        color: theme.colors.error,
        fontSize: 16,
        fontWeight: 'bold',
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.primary,
    },
    editLink: {
        color: theme.colors.secondary,
        fontWeight: '600',
    },
    toggle: {
        width: 50,
        height: 30,
        borderRadius: 15,
        backgroundColor: theme.colors.border,
        padding: 2,
    },
    toggleActive: {
        backgroundColor: theme.colors.success,
    },
    toggleKnob: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: '#fff',
    },
    toggleKnobActive: {
        alignSelf: 'flex-end',
    },
});
