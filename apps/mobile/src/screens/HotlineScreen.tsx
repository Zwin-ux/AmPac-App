import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Modal } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';
import { createHotlineRequest } from '../services/firestore';
import { auth } from '../../firebaseConfig';
import AssistantBubble from '../components/AssistantBubble';

export default function HotlineScreen() {
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const navigation = useNavigation();

    const handleSubmit = async () => {
        if (!subject || !message) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        setLoading(true);
        try {
            // In dev mode, we might not have a user, so handle gracefully
            const uid = auth.currentUser?.uid || 'dev-user';

            await createHotlineRequest(
                uid,
                subject,
                message
            );

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
                                    onPress={() => {
                                        setModalVisible(false);
                                        Alert.alert('Request Sent', `We have received your request for a ${time} session.`);
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
        borderWidth: 1,
        borderColor: theme.colors.border,
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
