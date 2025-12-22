import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Modal, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';
import { createHotlineRequest } from '../services/firestore';
import { auth } from '../../firebaseConfig';
import AssistantBubble from '../components/AssistantBubble';
import { notifySupportChannel } from '../services/notifications';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

type ResourceCategory = 'All' | 'Videos' | 'Credit' | 'Tools' | 'Consulting' | 'Contact';
type SupportResource = {
    title: string;
    subtitle: string;
    url: string;
    category: Exclude<ResourceCategory, 'All'>;
    icon: string;
    badge?: string;
};

const SUPPORT_RESOURCES: SupportResource[] = [
    {
        title: 'ABCEE | Advancing Impact',
        subtitle: 'Video playlist',
        url: 'https://youtube.com/playlist?list=PLDBKt0HjN_ILd5O-rJ8F0Qn1s-sBttwZJ&si=TOdR8lz-hCU59fMq',
        category: 'Videos',
        icon: 'play-circle-outline',
        badge: 'YouTube',
    },
    {
        title: 'ABCEE | KYN: Numbers + Network',
        subtitle: 'Video playlist',
        url: 'https://youtube.com/playlist?list=PLDBKt0HjN_IKrfIL1Bfs7JHWvqfZcVVId&si=LoP1GGAqgOmG44F0',
        category: 'Videos',
        icon: 'stats-chart-outline',
        badge: 'YouTube',
    },
    {
        title: 'CFB 2024',
        subtitle: 'Flip-book resource',
        url: 'https://heyzine.com/flip-book/5fa991118c.html',
        category: 'Videos',
        icon: 'book-outline',
        badge: 'Guide',
    },
    {
        title: 'Business Power Tools',
        subtitle: 'Business plan + SBA resources',
        url: 'https://www.businesspowertools.com/ampac-business-plan-for-sba-loans-and-investor-funding/',
        category: 'Tools',
        icon: 'construct-outline',
        badge: 'Partner',
    },
    {
        title: 'Ecredable Business Credit Lift',
        subtitle: 'Build business credit profile',
        url: 'https://business.ecredable.com/ampac',
        category: 'Credit',
        icon: 'briefcase-outline',
        badge: 'Partner',
    },
    {
        title: 'Ecredable Personal Credit Lift',
        subtitle: 'Improve personal credit',
        url: 'https://ecredable.com/ampac',
        category: 'Credit',
        icon: 'person-outline',
        badge: 'Partner',
    },
    {
        title: 'SBDC Free Consulting',
        subtitle: 'Local small business consulting',
        url: 'https://americassbdc.org/',
        category: 'Consulting',
        icon: 'people-outline',
        badge: 'Free',
    },
    {
        title: 'SCORE Free Mentoring',
        subtitle: 'Mentors + templates + workshops',
        url: 'https://www.score.org/?gad_source=1&gclid=Cj0KCQjw4MSzBhC8ARIsAPFOuyUZjmnAbtDO8xSJ6GNxkpHv2AT97zeN5W7bB6H5ofarJuZQbbrehRUaAhBHEALw_wcB',
        category: 'Consulting',
        icon: 'school-outline',
        badge: 'Free',
    },
    {
        title: "Women’s Business Center",
        subtitle: 'SBA resource partners',
        url: 'https://www.sba.gov/local-assistance/resource-partners/womens-business-centers',
        category: 'Consulting',
        icon: 'heart-outline',
        badge: 'Free',
    },
    {
        title: "The Company Dr’s",
        subtitle: 'Advisory + business services',
        url: 'https://www.thecompanydrs.com/',
        category: 'Consulting',
        icon: 'medical-outline',
        badge: 'Partner',
    },
    {
        title: 'ABCEE Contact Card',
        subtitle: 'Quick contact info',
        url: 'https://hihello.me/p/aa9827b2-b576-44bb-87bc-bbf9182a4eb0',
        category: 'Contact',
        icon: 'card-outline',
    },
    {
        title: 'AmPac AI Support Agent (Free)',
        subtitle: 'Instant answers + guidance',
        url: 'https://ampac-chat-bot-668f10cafef2.herokuapp.com/',
        category: 'Contact',
        icon: 'chatbubbles-outline',
        badge: 'Free',
    },
];

export default function HotlineScreen() {
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [resourceCategory, setResourceCategory] = useState<ResourceCategory>('All');
    const [resourceQuery, setResourceQuery] = useState('');
    const navigation = useNavigation();

    const openUrl = async (url: string) => {
        try {
            // Try to open the URL directly first
            const supported = await Linking.canOpenURL(url);
            if (supported) {
                await Linking.openURL(url);
                return;
            }
            
            // If not supported, try with different URL schemes
            const webUrl = url.startsWith('http') ? url : `https://${url}`;
            const webSupported = await Linking.canOpenURL(webUrl);
            if (webSupported) {
                await Linking.openURL(webUrl);
                return;
            }
            
            // Final fallback - show message
            Alert.alert(
                'Cannot Open Link',
                `Your device cannot open this link directly.\n\nURL: ${url}`,
                [{ text: 'OK' }]
            );
        } catch (err) {
            console.error('Failed to open URL', url, err);
            Alert.alert(
                'Error Opening Link',
                'Could not open the link. Please try again later.',
                [{ text: 'OK' }]
            );
        }
    };

    const filteredResources = SUPPORT_RESOURCES.filter((item) => {
        const matchesCategory = resourceCategory === 'All' ? true : item.category === resourceCategory;
        const q = resourceQuery.trim().toLowerCase();
        const matchesQuery = !q ? true : `${item.title} ${item.subtitle}`.toLowerCase().includes(q);
        return matchesCategory && matchesQuery;
    });

    const handleSubmit = async () => {
        if (!subject || !message) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        setLoading(true);
        try {
            if (!auth.currentUser) {
                Alert.alert('Sign in required', 'Please sign in to contact support.');
                return;
            }
            const uid = auth.currentUser.uid;

            const stored = await createHotlineRequest(
                uid,
                subject,
                message
            );

            const notified = await notifySupportChannel({
                title: 'New Support Hotline Request',
                body: `Subject: ${subject}\nMessage: ${message}\nUser: ${uid}`,
            });

            if (!stored) {
                console.warn('Hotline Firestore write failed; likely permissions. Proceeding with webhook only.');
            }
            if (!notified) {
                Alert.alert('Warning', 'We could not notify support automatically. Please try again.');
                return;
            }

            Alert.alert('Success', 'Your request has been sent to AmPac support.');
            setSubject('');
            setMessage('');
            navigation.goBack();
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to send request. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Text style={styles.backButtonText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Support Hotline</Text>
                <View style={{ width: 60 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Card style={styles.heroCard}>
                    <View style={styles.heroTopRow}>
                        <View style={styles.heroIcon}>
                            <Ionicons name="help-circle-outline" size={18} color={theme.colors.text} />
                        </View>
                        <Text style={styles.heroEyebrow}>Fast Help</Text>
                    </View>
                    <Text style={styles.heroTitle}>Get support in seconds</Text>
                    <Text style={styles.heroSubtitle}>
                        Use the AI agent for quick answers, or send a message and a business advisor will follow up.
                    </Text>
                    <View style={styles.heroActions}>
                        <Button
                            title="OPEN AI AGENT"
                            onPress={() => openUrl('https://ampac-chat-bot-668f10cafef2.herokuapp.com/')}
                            icon={<Ionicons name="sparkles-outline" size={16} color="#fff" />}
                            style={{ flex: 1 }}
                        />
                        <Button
                            title="CONTACT CARD"
                            variant="secondary"
                            onPress={() => openUrl('https://hihello.me/p/aa9827b2-b576-44bb-87bc-bbf9182a4eb0')}
                            icon={<Ionicons name="card-outline" size={16} color={theme.colors.text} />}
                            style={{ flex: 1 }}
                        />
                    </View>
                </Card>

                <View style={styles.introSection}>
                    <Text style={styles.title}>How can we help?</Text>
                    <Text style={styles.subtitle}>
                        Send us a message and a business advisor will get back to you shortly.
                    </Text>
                </View>

                <View style={styles.formCard}>
                    <Text style={styles.label}>Subject</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g., Funding Question"
                        placeholderTextColor={theme.colors.textSecondary}
                        value={subject}
                        onChangeText={setSubject}
                    />

                    <Text style={styles.label}>Message</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Describe your issue..."
                        placeholderTextColor={theme.colors.textSecondary}
                        value={message}
                        onChangeText={setMessage}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                    />

                    <TouchableOpacity
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={handleSubmit}
                        disabled={loading}
                    >
                        <Text style={styles.buttonText}>{loading ? 'Sending...' : 'Send Request'}</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.taSection}>
                    <View style={styles.taHeader}>
                        <Text style={styles.taTitle}>Technical Assistance</Text>
                        <Text style={styles.taBadge}>New</Text>
                    </View>
                    <Text style={styles.taDescription}>
                        Schedule a 1-on-1 video session with a certified technical assistance provider.
                    </Text>
                    <TouchableOpacity style={styles.taButton} onPress={() => setModalVisible(true)}>
                        <Text style={styles.taButtonText}>Schedule Session</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.resourcesSection}>
                    <Text style={styles.resourcesTitle}>Resources</Text>
                    <Text style={styles.resourcesSubtitle}>Videos, tools, credit programs, and free consulting partners.</Text>

                    <View style={styles.searchRow}>
                        <Ionicons name="search-outline" size={18} color={theme.colors.textSecondary} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search resources"
                            placeholderTextColor={theme.colors.textSecondary}
                            value={resourceQuery}
                            onChangeText={setResourceQuery}
                            autoCapitalize="none"
                        />
                        {resourceQuery ? (
                            <TouchableOpacity onPress={() => setResourceQuery('')} style={styles.clearBtn}>
                                <Ionicons name="close-circle" size={18} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                        ) : null}
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
                        {(['All', 'Videos', 'Credit', 'Tools', 'Consulting', 'Contact'] as ResourceCategory[]).map((cat) => (
                            <TouchableOpacity
                                key={cat}
                                style={[styles.chip, resourceCategory === cat && styles.chipActive]}
                                onPress={() => setResourceCategory(cat)}
                            >
                                <Text style={[styles.chipText, resourceCategory === cat && styles.chipTextActive]}>
                                    {cat}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    <View style={styles.resourceList}>
                        {filteredResources.map((item) => (
                            <TouchableOpacity
                                key={item.url}
                                style={styles.resourceRow}
                                onPress={() => openUrl(item.url)}
                                activeOpacity={0.85}
                            >
                                <View style={styles.resourceIconWrap}>
                                    <Ionicons name={item.icon as any} size={18} color={theme.colors.text} />
                                </View>
                                <View style={styles.resourceText}>
                                    <Text style={styles.resourceTitle}>{item.title}</Text>
                                    <Text style={styles.resourceSubtitleText}>{item.subtitle}</Text>
                                </View>
                                {item.badge ? (
                                    <View style={styles.badge}>
                                        <Text style={styles.badgeText}>{item.badge}</Text>
                                    </View>
                                ) : null}
                                <Ionicons name="open-outline" size={18} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                        ))}
                        {filteredResources.length === 0 ? (
                            <Text style={styles.noResults}>No matches. Try a different search.</Text>
                        ) : null}
                    </View>
                </View>
            </ScrollView>

            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Request TA Session</Text>
                        <Text style={styles.modalSubtitle}>Select a preferred time for your session:</Text>

                        <View style={styles.timeSlotContainer}>
                            {['Morning', 'Afternoon', 'Evening'].map((time) => (
                                <TouchableOpacity
                                    key={time}
                                    style={styles.timeSlot}
                            onPress={async () => {
                                setModalVisible(false);
                                Alert.alert('Request Sent', `We have received your request for a ${time} session.`);
                                if (!auth.currentUser) {
                                    Alert.alert('Sign in required', 'Please sign in to request a session.');
                                    return;
                                }
                                const uid = auth.currentUser.uid;
                                const notified = await notifySupportChannel({
                                    title: 'Technical Assistance Request',
                                    body: `Preferred time: ${time}\nUser: ${uid}`,
                                });
                                if (!notified) {
                                    Alert.alert('Warning', 'We could not notify support automatically. Please try again.');
                                }
                            }}
                        >
                            <Text style={styles.timeSlotText}>{time}</Text>
                        </TouchableOpacity>
                    ))}
                        </View>

                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={() => setModalVisible(false)}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
            <AssistantBubble context="support" />
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
        padding: theme.spacing.md,
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    backButton: {
        padding: theme.spacing.sm,
    },
    backButtonText: {
        color: theme.colors.primary,
        fontSize: 16,
    },
    scrollContent: {
        padding: theme.spacing.lg,
    },
    heroCard: {
        marginBottom: theme.spacing.lg,
        padding: theme.spacing.lg,
    },
    heroTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
        gap: theme.spacing.sm,
    },
    heroIcon: {
        width: 32,
        height: 32,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.surfaceHighlight,
        borderWidth: 1,
        borderColor: theme.colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    heroEyebrow: {
        ...theme.typography.label as any,
    },
    heroTitle: {
        ...theme.typography.h2,
        marginBottom: theme.spacing.xs,
    },
    heroSubtitle: {
        ...theme.typography.body,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.md,
    },
    heroActions: {
        flexDirection: 'row',
        gap: theme.spacing.sm,
    },
    introSection: {
        marginBottom: theme.spacing.xl,
    },
    title: {
        ...theme.typography.h1,
        marginBottom: theme.spacing.xs,
    },
    subtitle: {
        ...theme.typography.body,
        color: theme.colors.textSecondary,
    },
    formCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.xl,
        ...theme.shadows.card,
        marginBottom: theme.spacing.xl,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
    },
    input: {
        backgroundColor: theme.colors.background,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        fontSize: 16,
        color: theme.colors.text,
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginBottom: theme.spacing.lg,
    },
    textArea: {
        minHeight: 120,
    },
    button: {
        backgroundColor: theme.colors.primary,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
        marginTop: theme.spacing.xs,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    taSection: {
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        ...theme.shadows.card,
    },
    taHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
    },
    taTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginRight: theme.spacing.sm,
    },
    taBadge: {
        backgroundColor: theme.colors.secondary,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
        overflow: 'hidden',
    },
    taDescription: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.lg,
        lineHeight: 20,
    },
    taButton: {
        backgroundColor: 'transparent',
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.primary,
    },
    taButtonText: {
        color: theme.colors.primary,
        fontSize: 16,
        fontWeight: '600',
    },
    resourcesSection: {
        marginTop: theme.spacing.xl,
        paddingBottom: theme.spacing.xl,
    },
    resourcesTitle: {
        ...theme.typography.h2,
        marginBottom: 4,
    },
    resourcesSubtitle: {
        ...theme.typography.body,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.md,
    },
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: 10,
        gap: theme.spacing.sm,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: theme.colors.text,
        paddingVertical: 0,
    },
    clearBtn: {
        padding: 2,
    },
    chipsRow: {
        marginTop: theme.spacing.md,
        marginBottom: theme.spacing.md,
    },
    chip: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: theme.borderRadius.round,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
        marginRight: 8,
    },
    chipActive: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    chipText: {
        fontSize: 12,
        fontWeight: '700',
        color: theme.colors.textSecondary,
        letterSpacing: 0.2,
    },
    chipTextActive: {
        color: '#fff',
    },
    resourceList: {
        gap: theme.spacing.sm,
    },
    resourceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: theme.spacing.md,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        gap: theme.spacing.md,
    },
    resourceIconWrap: {
        width: 36,
        height: 36,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.surfaceHighlight,
        borderWidth: 1,
        borderColor: theme.colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    resourceText: {
        flex: 1,
    },
    resourceTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: theme.colors.text,
        marginBottom: 2,
    },
    resourceSubtitleText: {
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
        marginRight: theme.spacing.sm,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '800',
        color: theme.colors.textSecondary,
        letterSpacing: 0.2,
    },
    noResults: {
        ...theme.typography.caption,
        marginTop: theme.spacing.md,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: theme.borderRadius.xl,
        borderTopRightRadius: theme.borderRadius.xl,
        padding: theme.spacing.xl,
        paddingBottom: 40,
        ...theme.shadows.float,
    },
    modalTitle: {
        ...theme.typography.h2,
        marginBottom: theme.spacing.xs,
        textAlign: 'center',
    },
    modalSubtitle: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginBottom: theme.spacing.xl,
    },
    timeSlotContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.xl,
    },
    timeSlot: {
        flex: 1,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        alignItems: 'center',
        marginHorizontal: 4,
        backgroundColor: theme.colors.background,
    },
    timeSlotText: {
        fontWeight: '600',
        color: theme.colors.text,
    },
    cancelButton: {
        padding: theme.spacing.md,
        alignItems: 'center',
    },
    cancelButtonText: {
        color: theme.colors.textSecondary,
        fontWeight: '600',
        fontSize: 16,
    },
});
