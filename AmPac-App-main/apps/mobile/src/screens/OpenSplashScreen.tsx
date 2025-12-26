import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

const SEEN_KEY = 'ampac_open_splash_seen_v1';

const OPEN_SPLASH_LINKS = [
    {
        title: 'Welcome Video',
        subtitle: 'Start here (2–3 minutes)',
        url: 'https://youtu.be/v8FHmyxQmYE?si=P7tXjux7-fjxfBo3',
        icon: 'play-circle-outline',
        badge: 'Video',
    },
    {
        title: '2026 Financial Forecast',
        subtitle: 'Numbers + outlook',
        url: 'https://youtu.be/mpjijCYkpRQ',
        icon: 'trending-up-outline',
        badge: 'Video',
    },
] as const;

export default function OpenSplashScreen({ navigation }: any) {
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        const run = async () => {
            try {
                const seen = await AsyncStorage.getItem(SEEN_KEY);
                if (seen === '1') {
                    navigation.replace('Landing');
                    return;
                }
            } catch (err) {
                console.warn('OpenSplash: failed to read seen flag', err);
            } finally {
                setChecking(false);
            }
        };
        run();
    }, [navigation]);

    const openUrl = async (url: string) => {
        try {
            const supported = await Linking.canOpenURL(url);
            if (!supported) {
                Alert.alert('Error', 'Cannot open this link on your device.');
                return;
            }
            await Linking.openURL(url);
        } catch (err) {
            console.error('OpenSplash: failed to open URL', url, err);
            Alert.alert('Error', 'Could not open the link. Please try again.');
        }
    };

    const dismiss = async () => {
        try {
            await AsyncStorage.setItem(SEEN_KEY, '1');
        } catch (err) {
            console.warn('OpenSplash: failed to persist seen flag', err);
        }
        navigation.replace('Landing');
    };

    if (checking) {
        return <SafeAreaView style={styles.container} />;
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <Text style={styles.title}>Welcome to the AmPac Ecosystem!</Text>
                    <Text style={styles.subtitle}>Your Business Growth Resource Hub</Text>
                </View>

                <Card style={styles.card}>
                    <View style={styles.cardHeaderRow}>
                        <Text style={styles.cardTitle}>Start Here</Text>
                        <View style={styles.pill}>
                            <Text style={styles.pillText}>New</Text>
                        </View>
                    </View>
                    <Text style={styles.cardSubtitle}>
                        Watch the welcome video, then explore the tools and community features inside the app.
                    </Text>

                    <View style={styles.linksWrap}>
                        {OPEN_SPLASH_LINKS.map((l) => (
                            <TouchableOpacity
                                key={l.url}
                                style={styles.linkRow}
                                onPress={() => openUrl(l.url)}
                                activeOpacity={0.85}
                            >
                                <View style={styles.linkIcon}>
                                    <Ionicons name={l.icon as any} size={18} color={theme.colors.text} />
                                </View>
                                <View style={styles.linkTextWrap}>
                                    <Text style={styles.linkTitle}>{l.title}</Text>
                                    <Text style={styles.linkSubtitle}>{l.subtitle}</Text>
                                </View>
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>{l.badge}</Text>
                                </View>
                                <Ionicons name="open-outline" size={18} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                        ))}
                    </View>
                </Card>

                <Card style={[styles.card, { marginTop: theme.spacing.md }]}>
                    <Text style={styles.cardTitle}>What you can do in the app</Text>
                    <View style={styles.bullets}>
                        <View style={styles.bulletRow}>
                            <Ionicons name="checkmark-circle-outline" size={18} color={theme.colors.success} />
                            <Text style={styles.bulletText}>Track your loan application status and next steps</Text>
                        </View>
                        <View style={styles.bulletRow}>
                            <Ionicons name="checkmark-circle-outline" size={18} color={theme.colors.success} />
                            <Text style={styles.bulletText}>Book spaces and connect with the community</Text>
                        </View>
                        <View style={styles.bulletRow}>
                            <Ionicons name="checkmark-circle-outline" size={18} color={theme.colors.success} />
                            <Text style={styles.bulletText}>Get help from Support + curated resources</Text>
                        </View>
                    </View>
                </Card>

                <Button
                    title="GOT IT! THANK YOU!"
                    onPress={dismiss}
                    style={styles.primaryCta}
                />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    content: {
        padding: theme.spacing.lg,
        paddingBottom: theme.spacing.xxl,
    },
    header: {
        alignItems: 'flex-start',
        marginBottom: theme.spacing.lg,
    },
    logo: {
        width: 120,
        height: 40,
        marginBottom: theme.spacing.md,
    },
    title: {
        ...theme.typography.display as any,
        fontSize: 34,
        lineHeight: 40,
        marginBottom: theme.spacing.sm,
    },
    subtitle: {
        ...theme.typography.body,
        color: theme.colors.textSecondary,
    },
    card: {
        padding: theme.spacing.lg,
    },
    cardHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.sm,
    },
    cardTitle: {
        ...theme.typography.h2,
    },
    cardSubtitle: {
        ...theme.typography.body,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.md,
    },
    pill: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: theme.borderRadius.round,
        backgroundColor: theme.colors.surfaceHighlight,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    pillText: {
        fontSize: 11,
        fontWeight: '800',
        color: theme.colors.textSecondary,
        letterSpacing: 0.2,
    },
    linksWrap: {
        gap: theme.spacing.sm,
    },
    linkRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        gap: theme.spacing.md,
    },
    linkIcon: {
        width: 36,
        height: 36,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.surfaceHighlight,
        borderWidth: 1,
        borderColor: theme.colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    linkTextWrap: {
        flex: 1,
    },
    linkTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: theme.colors.text,
        marginBottom: 2,
    },
    linkSubtitle: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        lineHeight: 18,
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: theme.borderRadius.round,
        backgroundColor: theme.colors.surfaceHighlight,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '800',
        color: theme.colors.textSecondary,
        letterSpacing: 0.2,
    },
    bullets: {
        gap: theme.spacing.sm,
        marginTop: theme.spacing.md,
    },
    bulletRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
    },
    bulletText: {
        ...theme.typography.body,
        flex: 1,
    },
    primaryCta: {
        marginTop: theme.spacing.xl,
        height: 52,
    },
});
