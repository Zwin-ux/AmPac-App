import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Image } from 'react-native';
import { auth } from '../../firebaseConfig';
import { signOut } from 'firebase/auth';
import { getCurrentUserDoc } from '../services/firestore';
import { User } from '../types';
import { theme } from '../theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { DataField } from '../components/ui/DataField';

import { cacheService } from '../services/cache';

const CACHE_KEY_PROFILE = 'cache_user_profile';

export default function ProfileScreen({ navigation }: any) {
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
                    if (cached.notificationsEnabled !== undefined) {
                        setNotificationsEnabled(cached.notificationsEnabled);
                    }
                    setLoading(false);
                }

                const currentUser = auth.currentUser;
                if (currentUser) {
                    const userData = await getCurrentUserDoc(currentUser.uid);
                    setUser(userData);
                    if (userData?.notificationsEnabled !== undefined) {
                        setNotificationsEnabled(userData.notificationsEnabled);
                    }
                    await cacheService.set(CACHE_KEY_PROFILE, userData);
                } else {
                    setUser(null);
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
            // Attempt to clear local data, but don't block sign out
            try {
                await cacheService.clear();
                const AsyncStorage = require('@react-native-async-storage/async-storage').default;
                await AsyncStorage.clear();
            } catch (e) {
                console.warn("Cache clear failed", e);
            }
            
            await signOut(auth);
        } catch (error) {
            console.error("Error signing out:", error);
            // Force navigation to login if auth fails (fallback)
            // navigation.reset(...) - handled by App.tsx state change usually
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
            <View style={styles.header}>
                <Text style={styles.headerTitle}>PROFILE</Text>
                <Button
                    title="EDIT"
                    variant="ghost"
                    onPress={() => navigation.navigate('EditProfile')}
                    textStyle={styles.editButtonText}
                />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.profileHeader}>
                    <View style={styles.avatarContainer}>
                        <Text style={styles.avatarText}>{user?.fullName?.charAt(0) || '?'}</Text>
                    </View>
                    <View style={styles.headerInfo}>
                        <Text style={styles.name}>{user?.fullName || 'N/A'}</Text>
                        <Text style={styles.role}>{user?.jobTitle || 'Entrepreneur'}</Text>
                        <Text style={styles.company}>{user?.businessName || 'N/A'}</Text>
                    </View>
                </View>

                <View style={styles.actionsRow}>
                    <Button
                        title="INVITE TEAM"
                        onPress={() => navigation.navigate('InviteFriends')}
                        variant="secondary"
                        style={{ flex: 1, marginRight: 8 }}
                        icon={<Ionicons name="share-outline" size={16} color={theme.colors.text} />}
                    />
                    <Button
                        title="SIGN OUT"
                        onPress={handleSignOut}
                        variant="ghost"
                        style={{ flex: 1, marginLeft: 8, borderColor: theme.colors.error, borderWidth: 1 }}
                        textStyle={{ color: theme.colors.error }}
                    />
                </View>

                <Text style={styles.sectionLabel}>CONTACT_INFO</Text>
                <Card style={styles.infoCard} variant="flat">
                    <DataField label="EMAIL" value={auth.currentUser?.email} />
                    <View style={styles.spacer} />
                    <DataField label="PHONE" value={user?.phone} />
                    <View style={styles.spacer} />
                    <DataField label="INDUSTRY" value={user?.industry} />
                </Card>

                <Text style={styles.sectionLabel}>BIO</Text>
                <Card style={styles.infoCard} variant="flat">
                    <Text style={styles.bioText}>
                        {user?.bio || 'No bio provided.'}
                    </Text>
                </Card>

                <Text style={styles.sectionLabel}>PROFILE_DETAILS</Text>
                <Card style={styles.infoCard} variant="flat">
                    <TouchableOpacity
                        style={styles.navRow}
                        onPress={() => navigation.navigate('Demographics')}
                        activeOpacity={0.85}
                    >
                        <View style={styles.navIcon}>
                            <Ionicons name="id-card-outline" size={18} color={theme.colors.text} />
                        </View>
                        <View style={styles.navText}>
                            <Text style={styles.navTitle}>Demographics (optional)</Text>
                            <Text style={styles.navValue} numberOfLines={2}>
                                {user?.demographics?.raceEthnicity?.length
                                    ? user.demographics.raceEthnicity.join(', ')
                                    : 'Not provided'}
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
                    </TouchableOpacity>

                    <View style={styles.divider} />

                    <TouchableOpacity
                        style={styles.navRow}
                        onPress={() => navigation.navigate('Skills')}
                        activeOpacity={0.85}
                    >
                        <View style={styles.navIcon}>
                            <Ionicons name="sparkles-outline" size={18} color={theme.colors.text} />
                        </View>
                        <View style={styles.navText}>
                            <Text style={styles.navTitle}>Skills & Services</Text>
                            <Text style={styles.navValue}>
                                {user?.skills?.length ? `${user.skills.length} selected` : 'Add your skills'}
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                </Card>

                <Text style={styles.sectionLabel}>SYSTEM</Text>
                <Card style={styles.infoCard} variant="flat">
                    <View style={[styles.infoRow, { justifyContent: 'space-between', alignItems: 'center' }]}>
                        <Text style={styles.settingLabel}>NOTIFICATIONS</Text>
                        <TouchableOpacity
                            onPress={async () => {
                                const newValue = !notificationsEnabled;
                                setNotificationsEnabled(newValue);
                                if (auth.currentUser) {
                                    try {
                                        const { updateUserDoc } = await import('../services/firestore');
                                        await updateUserDoc(auth.currentUser.uid, { notificationsEnabled: newValue });
                                        // Update cache
                                        const updated = { ...user, notificationsEnabled: newValue } as User;
                                        setUser(updated);
                                        await cacheService.set(CACHE_KEY_PROFILE, updated);
                                    } catch (err) {
                                        console.error("Failed to save notification setting", err);
                                        // Revert on error
                                        setNotificationsEnabled(!newValue);
                                    }
                                }
                            }}
                            style={[styles.toggle, notificationsEnabled && styles.toggleActive]}
                        >
                            <View style={[styles.toggleKnob, notificationsEnabled && styles.toggleKnobActive]} />
                        </TouchableOpacity>
                    </View>
                </Card>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
    },
    headerTitle: {
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 1,
        color: theme.colors.text,
    },
    editButtonText: {
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 0.5,
        color: theme.colors.primary,
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
    profileHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.xl,
        padding: theme.spacing.md,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
    },
    avatarContainer: {
        width: 64,
        height: 64,
        borderRadius: theme.borderRadius.sm, // Sharper corners
        backgroundColor: theme.colors.surfaceHighlight,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    avatarText: {
        fontSize: 24,
        fontWeight: '700',
        color: theme.colors.text,
    },
    headerInfo: {
        flex: 1,
    },
    name: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: 2,
    },
    role: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: 2,
    },
    company: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.primary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    actionsRow: {
        flexDirection: 'row',
        marginBottom: theme.spacing.xl,
    },
    sectionLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.sm,
        marginLeft: 2,
        letterSpacing: 1,
    },
    infoCard: {
        marginBottom: theme.spacing.lg,
        padding: theme.spacing.md,
    },
    spacer: {
        height: theme.spacing.md,
    },
    infoRow: {
        paddingVertical: 4,
    },
    settingLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
        letterSpacing: 0.5,
    },
    bioText: {
        fontSize: 14,
        color: theme.colors.text,
        lineHeight: 20,
    },
    navRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
    },
    navIcon: {
        width: 36,
        height: 36,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    navText: {
        flex: 1,
    },
    navTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: 2,
    },
    navValue: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        lineHeight: 18,
    },
    divider: {
        height: 1,
        backgroundColor: theme.colors.border,
        marginVertical: theme.spacing.sm,
    },
    toggle: {
        width: 40,
        height: 20,
        borderRadius: 4, // Sharper
        backgroundColor: theme.colors.surfaceHighlight,
        padding: 2,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    toggleActive: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    toggleKnob: {
        width: 14,
        height: 14,
        borderRadius: 2, // Square-ish
        backgroundColor: theme.colors.textSecondary,
    },
    toggleKnobActive: {
        alignSelf: 'flex-end',
        backgroundColor: '#fff',
    },
});
