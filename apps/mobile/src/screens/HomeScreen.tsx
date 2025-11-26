import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Image } from 'react-native';
import { auth } from '../../firebaseConfig';
import { getCurrentUserDoc } from '../services/firestore';
import { User } from '../types';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import AssistantBubble from '../components/AssistantBubble';
import { Timestamp } from 'firebase/firestore';

export default function HomeScreen() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const navigation = useNavigation<any>();

    useEffect(() => {
        const fetchUser = async () => {
            try {
                if (auth.currentUser) {
                    const userData = await getCurrentUserDoc(auth.currentUser.uid);
                    setUser(userData);
                } else {
                    // Mock user for dev mode
                    setUser({
                        uid: 'dev-user',
                        role: 'entrepreneur',
                        fullName: 'Test Entrepreneur',
                        businessName: 'Dev Business Inc.',
                        phone: '555-0123',
                        createdAt: Timestamp.now()
                    });
                }
            } catch (error) {
                console.error("Error fetching user:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchUser();
    }, []);

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    const userName = user?.fullName?.split(' ')[0] || 'Entrepreneur';

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Image
                        source={require('../../assets/ampac_logo.png')}
                        style={styles.headerLogo}
                        resizeMode="contain"
                    />
                    <Text style={styles.welcomeText}>Welcome back, {userName}!</Text>
                </View>
                <TouchableOpacity style={styles.profileButton} onPress={() => navigation.navigate('Profile')}>
                    <Text style={styles.profileButtonText}>{userName.charAt(0)}</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {user?.businessName && (
                    <View style={styles.businessCard}>
                        <Text style={styles.businessLabel}>Your Business</Text>
                        <Text style={styles.businessName}>{user.businessName}</Text>
                    </View>
                )}

                <Text style={styles.sectionTitle}>Quick Actions</Text>

                <TouchableOpacity
                    style={styles.actionCard}
                    onPress={() => navigation.navigate('Support')}
                >
                    <View style={styles.actionIconPlaceholder}>
                        <Text style={{ fontSize: 24 }}>📞</Text>
                    </View>
                    <View style={styles.actionContent}>
                        <Text style={styles.actionTitle}>Talk to AmPac</Text>
                        <Text style={styles.actionDescription}>Get help with funding, mentorship, or business advice.</Text>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionCard, { marginTop: theme.spacing.md }]}
                    onPress={() => navigation.navigate('Spaces')}
                >
                    <View style={[styles.actionIconPlaceholder, { backgroundColor: theme.colors.secondary }]}>
                        <Text style={{ fontSize: 24 }}>🏢</Text>
                    </View>
                    <View style={styles.actionContent}>
                        <Text style={styles.actionTitle}>Book a Space</Text>
                        <Text style={styles.actionDescription}>Find a room for your next meeting.</Text>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionCard, { marginTop: theme.spacing.md }]}
                    onPress={() => navigation.navigate('Network')}
                >
                    <View style={[styles.actionIconPlaceholder, { backgroundColor: theme.colors.primary }]}>
                        <Text style={{ fontSize: 24 }}>🌐</Text>
                    </View>
                    <View style={styles.actionContent}>
                        <Text style={styles.actionTitle}>Entrepreneur Ecosystem</Text>
                        <Text style={styles.actionDescription}>Connect with our support hub and partners.</Text>
                    </View>
                </TouchableOpacity>
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
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.lg,
        paddingTop: theme.spacing.md,
        paddingBottom: theme.spacing.lg,
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    headerLogo: {
        width: 120,
        height: 40,
        marginBottom: 4,
    },
    welcomeText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    profileButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    profileButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 18,
    },
    businessCard: {
        backgroundColor: theme.colors.primary,
        padding: theme.spacing.lg,
        borderRadius: theme.borderRadius.lg,
        marginBottom: theme.spacing.xl,
        marginTop: theme.spacing.lg,
        ...theme.shadows.card,
    },
    businessLabel: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 14,
        marginBottom: theme.spacing.xs,
    },
    businessName: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
    },
    sectionTitle: {
        ...theme.typography.h2,
        marginBottom: theme.spacing.md,
    },
    actionCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        ...theme.shadows.card,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    actionIconPlaceholder: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#e0f2f1',
        marginRight: theme.spacing.md,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionContent: {
        flex: 1,
    },
    actionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 4,
    },
    actionDescription: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        lineHeight: 20,
    },
});
