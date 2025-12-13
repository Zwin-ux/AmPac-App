import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, Linking, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';
import { applicationStore, ApplicationStoreState } from '../services/applicationStore';
import { Application, SyncStatus } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { LoanStatusTracker } from '../components/LoanStatusTracker';

const PORTAL_URL = 'https://ampac.gatewayportal.com/';

export default function ApplicationScreen() {
    // OPTIMISTIC: No blocking loading state - render immediately
    const [application, setApplication] = useState<Application | null>(() => applicationStore.getCachedDraft());
    const [syncStatus, setSyncStatus] = useState<SyncStatus>(applicationStore.getSyncStatus());
    
    // Pre-Qual State
    const [step, setStep] = useState<'intro' | 'questions' | 'ready'>('intro');
    const [answers, setAnswers] = useState({
        isOwner: null as boolean | null,
        amount: '',
        years: ''
    });

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
                                onPress={() => setAnswers({...answers, isOwner: true})}
                            >
                                <Text style={[styles.choiceText, answers.isOwner === true && styles.choiceTextActive]}>Yes</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.choiceBtn, answers.isOwner === false && styles.choiceBtnActive]}
                                onPress={() => setAnswers({...answers, isOwner: false})}
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
                            onChangeText={(t) => setAnswers({...answers, amount: t})}
                        />
                    </Card>

                    <Card style={styles.questionCard}>
                        <Text style={styles.questionLabel}>Years in Business</Text>
                        <TextInput 
                            style={styles.input}
                            placeholder="e.g. 3"
                            keyboardType="numeric"
                            value={answers.years}
                            onChangeText={(t) => setAnswers({...answers, years: t})}
                        />
                    </Card>

                    <Button 
                        title="Check Eligibility" 
                        onPress={() => {
                            if (answers.isOwner === null || !answers.amount) {
                                Alert.alert("Missing Info", "Please answer all questions.");
                                return;
                            }
                            setStep('ready');
                        }} 
                        style={styles.mainButton}
                    />
                </ScrollView>
            );
        }

        if (step === 'ready') {
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
                        onPress={handleOpenPortal} 
                        style={styles.portalButton}
                        textStyle={{ fontSize: 18, fontWeight: 'bold' }}
                    />
                    <TouchableOpacity onPress={() => setStep('intro')} style={{ marginTop: 20 }}>
                        <Text style={{ color: theme.colors.textSecondary }}>Start Over</Text>
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
                            variant="outline"
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
        marginBottom: 30,
        lineHeight: 24,
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
        marginBottom: 20,
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
});
