import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, Linking, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';
import { applicationStore, ApplicationStoreState } from '../services/applicationStore';
import { Application, SyncStatus } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { LoanStatusTracker } from '../components/LoanStatusTracker';
import { supportNotificationService } from '../services/supportNotificationService';
import { evaluateEligibility as evaluateLoanEligibility, EligibilityResult } from '../services/loanEligibility';

const PORTAL_URL = 'https://ampac.gatewayportal.com/';

export default function ApplicationScreen() {
    const navigation = useNavigation();
    // OPTIMISTIC: No blocking loading state - render immediately
    const [application, setApplication] = useState<Application | null>(() => applicationStore.getCachedDraft());
    const [syncStatus, setSyncStatus] = useState<SyncStatus>(applicationStore.getSyncStatus());

    // Pre-Qual State
    const [step, setStep] = useState<'intro' | 'questions' | 'eligible' | 'alternative' | 'ineligible'>('intro');
    const [answers, setAnswers] = useState({
        isOwner: null as boolean | null,
        amount: '',
        years: ''
    });
    const [reasons, setReasons] = useState<string[]>([]);
    const [suggestions, setSuggestions] = useState<string[]>([]);

    // OPTIMISTIC: Subscribe to store updates
    useEffect(() => {
        const unsubscribe = applicationStore.subscribe((state: ApplicationStoreState) => {
            setApplication(state.draft);
            setSyncStatus(state.syncStatus);
        });
        return () => unsubscribe();
    }, []);

    const handleOpenPortal = async () => {
        const supported = await Linking.canOpenURL(PORTAL_URL);
        if (supported) {
            await Linking.openURL(PORTAL_URL);
        } else {
            Alert.alert("Error", "Cannot open the portal link.");
        }
    };


    const evaluateEligibility = async () => {
        // Use the extracted loan eligibility service for testability
        const result = await evaluateLoanEligibility(answers);

        setReasons(result.issues);
        setSuggestions(result.suggestions);
        setStep(result.step);
    };

    const renderPreQualFlow = () => {
        if (step === 'intro') {
            return (
                <View style={styles.centerContent}>
                    <Ionicons name="rocket-outline" size={64} color={theme.colors.primary} style={{ marginBottom: 20 }} />
                    <Text style={styles.title}>Instant Application</Text>
                    <Text style={styles.subtitle}>
                        Get pre-qualified for an SBA 504 or Community Loan in minutes.
                        We just need to ask a few preliminary questions.
                    </Text>
                    <Button
                        title="Start Pre-Check"
                        onPress={() => setStep('questions')}
                        style={styles.mainButton}
                    />
                </View>
            );
        }

        if (step === 'questions') {
            return (
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <Text style={styles.sectionTitle}>Preliminary Check</Text>

                    <Card style={styles.questionCard}>
                        <Text style={styles.questionLabel}>Are you the business owner?</Text>
                        <View style={styles.row}>
                            <TouchableOpacity
                                style={[styles.choiceBtn, answers.isOwner === true && styles.choiceBtnActive]}
                                onPress={() => setAnswers({ ...answers, isOwner: true })}
                            >
                                <Text style={[styles.choiceText, answers.isOwner === true && styles.choiceTextActive]}>Yes</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.choiceBtn, answers.isOwner === false && styles.choiceBtnActive]}
                                onPress={() => setAnswers({ ...answers, isOwner: false })}
                            >
                                <Text style={[styles.choiceText, answers.isOwner === false && styles.choiceTextActive]}>No</Text>
                            </TouchableOpacity>
                        </View>
                    </Card>

                    <Card style={styles.questionCard}>
                        <Text style={styles.questionLabel}>Estimated Loan Amount ($)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. 500000"
                            keyboardType="numeric"
                            value={answers.amount}
                            onChangeText={(t) => setAnswers({ ...answers, amount: t })}
                        />
                    </Card>

                    <Card style={styles.questionCard}>
                        <Text style={styles.questionLabel}>Years in Business</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. 3"
                            keyboardType="numeric"
                            value={answers.years}
                            onChangeText={(t) => setAnswers({ ...answers, years: t })}
                        />
                    </Card>

                    <Button
                        title="Check Eligibility"
                        onPress={() => {
                            if (answers.isOwner === null || !answers.amount || !answers.years) {
                                Alert.alert("Missing Info", "Please answer all questions.");
                                return;
                            }
                            evaluateEligibility();
                        }}
                        style={styles.mainButton}
                    />
                </ScrollView>
            );
        }

        if (step === 'alternative') {
            return (
                <View style={styles.centerContent}>
                    <Ionicons name="bulb" size={72} color={theme.colors.accent} style={{ marginBottom: 20 }} />
                    <Text style={styles.title}>Great! We have options for you</Text>
                    <Text style={styles.subtitle}>
                        While you may not qualify for our standard SBA program, we have other funding solutions that might be perfect for your business.
                    </Text>

                    {suggestions.length > 0 && (
                        <View style={styles.suggestionCard}>
                            <Text style={styles.suggestionTitle}>Recommended for you:</Text>
                            {suggestions.map((suggestion, idx) => (
                                <Text key={idx} style={styles.suggestionText}>• {suggestion}</Text>
                            ))}
                        </View>
                    )}

                    {reasons.length > 0 && (
                        <View style={styles.reasonCard}>
                            <Text style={styles.reasonTitle}>Why we're suggesting alternatives:</Text>
                            {reasons.map((reason, idx) => (
                                <Text key={idx} style={styles.reasonText}>• {reason}</Text>
                            ))}
                        </View>
                    )}

                    <Button
                        title="Explore Alternative Options"
                        onPress={async () => {
                            // Notify support team about alternative product interest
                            await supportNotificationService.notifyAlternativeProductInterest(
                                answers.amount,
                                answers.years,
                                suggestions.join('; ')
                            );
                            navigation.navigate('Support' as never);
                        }}
                        style={styles.portalButton}
                        textStyle={{ fontSize: 18, fontWeight: 'bold' }}
                    />

                    <Button
                        title="Continue to Standard Application"
                        onPress={async () => {
                            // Still allow them to proceed if they want
                            await supportNotificationService.notifyApplicationStarted();
                            handleOpenPortal();
                        }}
                        variant="secondary"
                        style={{ marginTop: 12, width: '100%' }}
                    />

                    <TouchableOpacity onPress={() => setStep('intro')} style={{ marginTop: 20 }}>
                        <Text style={{ color: theme.colors.textSecondary, fontWeight: '600' }}>Start Over</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        if (step === 'eligible') {
            return (
                <View style={styles.centerContent}>
                    <Ionicons name="checkmark-circle" size={80} color={theme.colors.success} style={{ marginBottom: 20 }} />
                    <Text style={styles.title}>You're Eligible!</Text>
                    <Text style={styles.subtitle}>
                        Based on your answers, you are a great candidate for AmPac financing.
                        Please complete your full application on our secure portal.
                    </Text>
                    <Button
                        title="Continue to Secure Portal"
                        onPress={async () => {
                            // Notify support team
                            await supportNotificationService.notifyApplicationStarted();
                            handleOpenPortal();
                        }}
                        style={styles.portalButton}
                        textStyle={{ fontSize: 18, fontWeight: 'bold' }}
                    />
                    <TouchableOpacity onPress={() => setStep('intro')} style={{ marginTop: 20 }}>
                        <Text style={{ color: theme.colors.textSecondary }}>Start Over</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        if (step === 'ineligible') {
            return (
                <View style={styles.centerContent}>
                    <Ionicons name="close-circle" size={72} color={theme.colors.error} style={{ marginBottom: 20 }} />
                    <Text style={styles.title}>We can’t proceed right now</Text>
                    <Text style={styles.subtitle}>
                        Based on your answers, this application doesn’t fit our current program. Please connect with our support team to explore other options or get guidance on your next steps.
                    </Text>
                    {reasons.length > 0 && (
                        <View style={styles.reasonCard}>
                            {reasons.map((r, idx) => (
                                <Text key={idx} style={styles.reasonText}>• {r}</Text>
                            ))}
                        </View>
                    )}
                    <Button
                        title="Connect with Support"
                        onPress={async () => {
                            // Notify support team with denial reasons
                            await supportNotificationService.notifyApplicationDenied(reasons.join('; '));
                            navigation.navigate('Support' as never);
                        }}
                        style={styles.portalButton}
                        textStyle={{ fontSize: 18, fontWeight: 'bold' }}
                    />
                    <TouchableOpacity onPress={() => setStep('intro')} style={{ marginTop: 24 }}>
                        <Text style={{ color: theme.colors.textSecondary, fontSize: 16, fontWeight: '600' }}>Start Over</Text>
                    </TouchableOpacity>
                </View>
            );
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Apply</Text>
            </View>

            {/* If user already has an active application, show status. Otherwise show Pre-Qual flow. */}
            {application && application.status !== 'draft' ? (
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <Text style={styles.sectionTitle}>Current Application</Text>
                    <LoanStatusTracker
                        status={application.status}
                        venturesStatus={application.venturesStatus}
                    />
                    <Card style={{ marginTop: 20, padding: 20 }}>
                        <Text style={styles.infoText}>
                            Your application is being processed. You can view more details or upload additional documents on our web portal.
                        </Text>
                        <Button
                            title="Go to Web Portal"
                            onPress={handleOpenPortal}
                            variant="secondary"
                            style={{ marginTop: 15 }}
                        />
                    </Card>
                </ScrollView>
            ) : (
                renderPreQualFlow()
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        padding: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    scrollContent: {
        padding: theme.spacing.lg,
    },
    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing.xl,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 10,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 24,
    },
    reasonCard: {
        width: '100%',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.lg,
        ...theme.shadows.card,
    },
    reasonText: {
        fontSize: 14,
        color: theme.colors.text,
        marginBottom: 6,
        lineHeight: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 15,
    },
    mainButton: {
        width: '100%',
        marginTop: 10,
    },
    portalButton: {
        width: '100%',
        backgroundColor: theme.colors.primary,
        paddingVertical: 16,
    },
    questionCard: {
        padding: 20,
        marginBottom: 12,
    },
    questionLabel: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 15,
        color: theme.colors.text,
    },
    input: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        backgroundColor: '#fff',
    },
    row: {
        flexDirection: 'row',
        gap: 15,
    },
    choiceBtn: {
        flex: 1,
        padding: 15,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 8,
        alignItems: 'center',
    },
    choiceBtnActive: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    choiceText: {
        fontSize: 16,
        color: theme.colors.text,
    },
    choiceTextActive: {
        color: '#fff',
        fontWeight: 'bold',
    },
    infoText: {
        fontSize: 15,
        color: theme.colors.textSecondary,
        lineHeight: 22,
    },
    suggestionCard: {
        width: '100%',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.md,
        borderLeftWidth: 4,
        borderLeftColor: theme.colors.accent,
        ...theme.shadows.card,
    },
    suggestionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 8,
    },
    suggestionText: {
        fontSize: 14,
        color: theme.colors.text,
        marginBottom: 6,
        lineHeight: 20,
    },
    reasonTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.textSecondary,
        marginBottom: 8,
    },
});
