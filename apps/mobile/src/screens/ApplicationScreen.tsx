import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';
import { auth } from '../../firebaseConfig';
import { getApplication, saveApplication, createApplication, cacheApplicationSnapshot } from '../services/applications';
import { Application } from '../types';
import AssistantBubble from '../components/AssistantBubble';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

type DocumentRequirement = {
    id: string;
    name: string;
    description: string;
    uploaded?: boolean;
    uploadedAt?: string;
};

const TOTAL_FORM_STEPS = 4;
const REQUIRED_DOCUMENTS: DocumentRequirement[] = [
    {
        id: 'tax_returns',
        name: 'Tax Returns (Last 2 Years)',
        description: 'PDF upload - 10MB max',
    },
    {
        id: 'p_and_l',
        name: 'P&L Statement',
        description: 'Most recent 12 months',
    },
    {
        id: 'balance_sheet',
        name: 'Balance Sheet',
        description: 'Year-to-date',
    },
];

export default function ApplicationScreen() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [application, setApplication] = useState<Application | null>(null);
    const [currentStep, setCurrentStep] = useState(0); // 0 = Eligibility, 1 = Business, 2 = Loan, 3 = Docs, 4 = Review
    const navigation = useNavigation<any>();

    // Eligibility State
    const [eligibility, setEligibility] = useState({
        yearsInBusiness: '',
        creditScore: '',
        bankruptcy: false,
    });
    const [documents, setDocuments] = useState<DocumentRequirement[]>(REQUIRED_DOCUMENTS.map(doc => ({ ...doc })));
    const [saveStatus, setSaveStatus] = useState<'idle' | 'local' | 'syncing' | 'synced'>('idle');
    const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
    const [eligibilitySummary, setEligibilitySummary] = useState<string | null>(null);
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const lastSavedLabel = useMemo(() => {
        if (saveStatus === 'syncing') return 'Syncing...';
        if (saveStatus === 'local' && !lastSavedAt) return 'Cached locally';
        if (lastSavedAt) {
            const seconds = Math.round((Date.now() - lastSavedAt) / 1000);
            if (seconds < 60) return `Saved ${seconds}s ago`;
            const minutes = Math.round(seconds / 60);
            return `Saved ${minutes}m ago`;
        }
        return 'Not saved yet';
    }, [saveStatus, lastSavedAt]);
    const documentsCompleted = useMemo(
        () => documents.filter(doc => doc.uploaded).length,
        [documents]
    );

    useEffect(() => {
        const loadApplication = async () => {
            try {
                const uid = auth.currentUser?.uid || 'dev-user';
                const existingApp = await getApplication(uid);

                if (existingApp) {
                    setApplication(existingApp);
                    setCurrentStep(existingApp.currentStep || 1);
                    setDocuments(((existingApp.data?.documents as DocumentRequirement[]) || REQUIRED_DOCUMENTS).map(doc => ({ ...doc })));
                    if (existingApp.lastUpdated) {
                        const lastUpdated: any = existingApp.lastUpdated;
                        if (typeof lastUpdated.toMillis === 'function') {
                            setLastSavedAt(lastUpdated.toMillis());
                        } else if (typeof lastUpdated.seconds === 'number') {
                            setLastSavedAt(lastUpdated.seconds * 1000);
                        }
                    }
                    setSaveStatus('synced');
                    if (existingApp.data?.eligibilitySummary) {
                        setEligibilitySummary(existingApp.data.eligibilitySummary as string);
                    }
                } else {
                    setCurrentStep(0); // Start with eligibility
                }
            } catch (error) {
                console.error("Error loading application:", error);
            } finally {
                setLoading(false);
            }
        };
        loadApplication();
    }, []);

    useEffect(() => {
        return () => {
            if (saveTimerRef.current) {
                clearTimeout(saveTimerRef.current);
            }
        };
    }, []);

    const queueSave = (draft: Application, pushRemote = false) => {
        const payload = { ...draft, currentStep: draft.currentStep ?? currentStep };
        setSaveStatus('local');
        cacheApplicationSnapshot(payload);

        if (!pushRemote) {
            return;
        }

        if (saveTimerRef.current) {
            clearTimeout(saveTimerRef.current);
        }

        saveTimerRef.current = setTimeout(async () => {
            setSaving(true);
            setSaveStatus('syncing');
            try {
                await saveApplication(payload.id, { ...payload, userId: payload.userId });
                setLastSavedAt(Date.now());
                setSaveStatus('synced');
            } catch (error) {
                console.error("Error auto-saving:", error);
                setSaveStatus('idle');
            } finally {
                setSaving(false);
            }
        }, 450);
    };

    const flushSave = async (payload?: Application) => {
        const draft = payload || application;
        if (!draft) return;

        const stepToPersist = draft.currentStep ?? currentStep;
        const dataToSave = { ...draft, currentStep: stepToPersist, userId: draft.userId };

        if (saveTimerRef.current) {
            clearTimeout(saveTimerRef.current);
            saveTimerRef.current = null;
        }

        setSaving(true);
        setSaveStatus('syncing');
        try {
            await saveApplication(draft.id, dataToSave);
            await cacheApplicationSnapshot(dataToSave as Application);
            setLastSavedAt(Date.now());
            setSaveStatus('synced');
        } catch (error) {
            console.error("Error saving application:", error);
            setSaveStatus('idle');
        } finally {
            setSaving(false);
        }
    };

    const handleStartNew = async (type: 'sba_504' | 'sba_7a') => {
        setLoading(true);
        const baselineDocs = REQUIRED_DOCUMENTS.map(doc => ({ ...doc }));
        try {
            const uid = auth.currentUser?.uid || 'dev-user';
            const newApp = await createApplication(uid, type);
            const seededApp: Application = {
                ...newApp,
                currentStep: 1,
                data: {
                    ...(newApp.data || {}),
                    documents: baselineDocs,
                    eligibilitySummary,
                },
            };

            setApplication(seededApp);
            setDocuments(baselineDocs);
            setCurrentStep(1);
            queueSave(seededApp, true);
        } catch (error) {
            console.error("Error creating application:", error);
            Alert.alert("Error", "Could not start application.");
            Alert.alert("Eligibility", "Typically, 2 years in business is required. We can still proceed, but approval may be harder.");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateField = (field: keyof Application, value: any) => {
        if (!application) return;
        const updatedApp = { ...application, [field]: value };
        setApplication(updatedApp);
        queueSave(updatedApp, true);
    };

    const handleNextStep = async () => {
        if (currentStep === 0) {
            // Validate Eligibility
            const years = parseInt(eligibility.yearsInBusiness);
            const score = parseInt(eligibility.creditScore);

            if (isNaN(years) || isNaN(score)) {
                Alert.alert("Error", "Please enter valid numbers.");
                return;
            }

            if (years < 2) {
                Alert.alert("Eligibility", "Typically, 2 years in business is required. We can still proceed, but approval may be harder.");
            }

            const summary = years < 2
                ? "Flagged: less than 2 years in business. We'll pair you with Community Lending if SBA is not a fit."
                : score < 660
                    ? "Credit is on the edge for SBA. Expect manual review; we will still proceed."
                    : "On track for SBA pre-check. Continue to product selection.";
            setEligibilitySummary(summary);

            // Proceed to create application shell if not exists, or just move to step 1 selection
            // For this flow, we'll just move to step 1 (Product Selection)
            setCurrentStep(1);
            return;
        }

        if (!application) {
            Alert.alert("Start Application", "Please pick a loan product to continue.");
            return;
        }

        const nextStep = Math.min(currentStep + 1, TOTAL_FORM_STEPS);
        const updatedApp: Application = { ...application, currentStep: nextStep };
        setApplication(updatedApp);
        setCurrentStep(nextStep);
        await flushSave(updatedApp);
    };

    const handlePrevStep = async () => {
        if (!application) {
            if (currentStep > 0) setCurrentStep(prev => prev - 1);
            return;
        }

        const prevStep = Math.max(currentStep - 1, 0);
        const updatedApp: Application = { ...application, currentStep: prevStep };
        setApplication(updatedApp);
        setCurrentStep(prevStep);
        await flushSave(updatedApp);
    };

    const handleMockUpload = (docId: string) => {
        const nextDocs = documents.map(doc =>
            doc.id === docId ? { ...doc, uploaded: true, uploadedAt: new Date().toISOString() } : doc
        );
        setDocuments(nextDocs);

        if (application) {
            const updatedApp: Application = {
                ...application,
                data: { ...(application.data || {}), documents: nextDocs },
            };
            setApplication(updatedApp);
            queueSave(updatedApp, true);
        }

        Alert.alert("Upload marked", "For the MVP demo, this document is marked as received.");
    };

    const handleSubmit = async () => {
        if (!application) return;
        const finalApp = { ...application, currentStep };
        await flushSave(finalApp);
        Alert.alert(
            "Application submitted",
            "Your application has been received. A loan officer will review it shortly.",
            [{ text: "Back to Home", onPress: () => navigation.navigate('Home') }]
        );
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    const renderProgressBar = () => {
        if (currentStep === 0) return null;
        const progress = (currentStep / TOTAL_FORM_STEPS) * 100;
        return (
            <View style={styles.progressContainer}>
                <View style={styles.progressBarBackground}>
                    <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
                </View>
                <Text style={styles.stepText}>Step {currentStep} of {TOTAL_FORM_STEPS}</Text>
            </View>
        );
    };

    const renderPerformanceStrip = () => (
        <View style={styles.metaStrip}>
            <View style={[styles.metaCard, { marginRight: theme.spacing.sm }]}>
                <Ionicons name={saveStatus === 'synced' ? 'cloud-done' : 'cloud-upload'} size={20} color={theme.colors.primary} />
                <View style={styles.metaCardBody}>
                    <Text style={styles.metaLabel}>Autosave</Text>
                    <Text style={styles.metaValue}>{lastSavedLabel}</Text>
                </View>
            </View>
            <View style={[styles.metaCard, { marginRight: theme.spacing.sm }]}>
                <Ionicons name="speedometer" size={20} color={theme.colors.secondary} />
                <View style={styles.metaCardBody}>
                    <Text style={styles.metaLabel}>Performance</Text>
                    <Text style={styles.metaValue}>Cached draft, offline ready</Text>
                </View>
            </View>
            <View style={[styles.metaCard, { marginRight: 0 }]}>
                <Ionicons name="documents" size={20} color={theme.colors.info} />
                <View style={styles.metaCardBody}>
                    <Text style={styles.metaLabel}>Documents</Text>
                    <Text style={styles.metaValue}>{documentsCompleted}/{documents.length} ready</Text>
                </View>
            </View>
        </View>
    );

    // Step 0: Eligibility
    const renderEligibility = () => (
        <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Let's check your eligibility</Text>
            <Text style={styles.stepDescription}>Answer a few quick questions to get started.</Text>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Years in Business</Text>
                <TextInput
                    style={styles.input}
                    value={eligibility.yearsInBusiness}
                    onChangeText={(text) => setEligibility({ ...eligibility, yearsInBusiness: text })}
                    keyboardType="numeric"
                    placeholder="e.g. 5"
                    placeholderTextColor={theme.colors.textSecondary}
                />
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Estimated Credit Score</Text>
                <TextInput
                    style={styles.input}
                    value={eligibility.creditScore}
                    onChangeText={(text) => setEligibility({ ...eligibility, creditScore: text })}
                    keyboardType="numeric"
                    placeholder="e.g. 720"
                    placeholderTextColor={theme.colors.textSecondary}
                />
            </View>

            {eligibilitySummary && (
                <View style={styles.eligibilityBanner}>
                    <Ionicons name="shield-checkmark" size={18} color={theme.colors.success} />
                    <Text style={styles.eligibilityText}>{eligibilitySummary}</Text>
                </View>
            )}

            <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={handleNextStep}>
                <Text style={styles.primaryButtonText}>Check Eligibility</Text>
            </TouchableOpacity>
        </View>
    );

    // Step 1: Product Selection (if no app) OR Business Info (if app exists)
    // Simplified: If no app, show selection. If app, show Business Info.
    const renderProductSelection = () => (
        <View style={styles.content}>
            <Text style={styles.title}>Select a Loan Product</Text>
            <Text style={styles.subtitle}>Based on your needs.</Text>

            <TouchableOpacity style={styles.card} onPress={() => handleStartNew('sba_504')}>
                <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>SBA 504 Loan</Text>
                    <Ionicons name="business" size={24} color={theme.colors.primary} />
                </View>
                <Text style={styles.cardDesc}>Best for purchasing major fixed assets like real estate or equipment.</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.card} onPress={() => handleStartNew('sba_7a')}>
                <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>SBA 7(a) Loan</Text>
                    <Ionicons name="cash" size={24} color={theme.colors.primary} />
                </View>
                <Text style={styles.cardDesc}>Flexible funding for working capital, debt refinancing, and more.</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.card, { opacity: 0.7 }]} onPress={() => Alert.alert("Coming Soon", "Community Lending applications will be available soon!")}>
                <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>Community Lending</Text>
                    <Ionicons name="people" size={24} color={theme.colors.secondary} />
                </View>
                <Text style={styles.cardDesc}>Microloans and smaller capital needs for growing businesses.</Text>
            </TouchableOpacity>
        </View>
    );

    const renderBusinessInfo = () => (
        <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Business Information</Text>
            <Text style={styles.stepDescription}>Tell us about your business entity.</Text>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Legal Business Name</Text>
                <TextInput
                    style={styles.input}
                    value={application?.businessName || ''}
                    onChangeText={(text) => handleUpdateField('businessName', text)}
                    placeholder="e.g. Acme Corp"
                    placeholderTextColor={theme.colors.textSecondary}
                />
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Years in Business</Text>
                <TextInput
                    style={styles.input}
                    value={application?.yearsInBusiness?.toString() || ''}
                    onChangeText={(text) => handleUpdateField('yearsInBusiness', parseInt(text) || 0)}
                    keyboardType="numeric"
                    placeholder="e.g. 5"
                    placeholderTextColor={theme.colors.textSecondary}
                />
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Annual Revenue</Text>
                <TextInput
                    style={styles.input}
                    value={application?.annualRevenue?.toString() || ''}
                    onChangeText={(text) => handleUpdateField('annualRevenue', parseInt(text) || 0)}
                    keyboardType="numeric"
                    placeholder="e.g. 500000"
                    placeholderTextColor={theme.colors.textSecondary}
                />
            </View>
        </View>
    );

    const renderLoanDetails = () => (
        <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Loan Details</Text>
            <Text style={styles.stepDescription}>How much do you need and what for?</Text>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Requested Loan Amount</Text>
                <TextInput
                    style={styles.input}
                    value={application?.loanAmount?.toString() || ''}
                    onChangeText={(text) => handleUpdateField('loanAmount', parseInt(text) || 0)}
                    keyboardType="numeric"
                    placeholder="e.g. 100000"
                    placeholderTextColor={theme.colors.textSecondary}
                />
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Use of Funds</Text>
                <TextInput
                    style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                    value={application?.useOfFunds || ''}
                    onChangeText={(text) => handleUpdateField('useOfFunds', text)}
                    multiline
                    placeholder="Describe how you will use the loan..."
                    placeholderTextColor={theme.colors.textSecondary}
                />
            </View>
        </View>
    );

    const renderDocuments = () => (
        <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Documents</Text>
            <Text style={styles.stepDescription}>Please upload the following documents.</Text>

            {documents.map((doc) => (
                <View key={doc.id} style={styles.docUploadRow}>
                    <View style={styles.docInfo}>
                        <Ionicons
                            name={doc.uploaded ? "checkmark-circle" : "document-text-outline"}
                            size={24}
                            color={doc.uploaded ? theme.colors.success : theme.colors.textSecondary}
                        />
                        <View style={styles.docTextGroup}>
                            <Text style={styles.docName}>{doc.name}</Text>
                            <Text style={styles.docHint}>{doc.uploaded ? "Received" : doc.description}</Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        style={[styles.uploadButton, doc.uploaded && styles.uploadButtonComplete]}
                        onPress={() => handleMockUpload(doc.id)}
                    >
                        <Text style={[styles.uploadButtonText, doc.uploaded && styles.uploadButtonTextComplete]}>
                            {doc.uploaded ? 'Replace' : 'Upload'}
                        </Text>
                    </TouchableOpacity>
                </View>
            ))}
            <Text style={styles.microCopy}>Uploads are mocked for the MVP; marking them updates your readiness score.</Text>
        </View>
    );

    const renderReview = () => (
        <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Review & Submit</Text>
            <Text style={styles.stepDescription}>Please review your information.</Text>

            <View style={styles.reviewCard}>
                <Text style={styles.reviewLabel}>Business Name:</Text>
                <Text style={styles.reviewValue}>{application?.businessName}</Text>

                <Text style={styles.reviewLabel}>Years in Business:</Text>
                <Text style={styles.reviewValue}>{application?.yearsInBusiness}</Text>

                <Text style={styles.reviewLabel}>Annual Revenue:</Text>
                <Text style={styles.reviewValue}>${application?.annualRevenue}</Text>

                <Text style={styles.reviewLabel}>Loan Amount:</Text>
                <Text style={styles.reviewValue}>${application?.loanAmount}</Text>

                <Text style={styles.reviewLabel}>Use of Funds:</Text>
                <Text style={styles.reviewValue}>{application?.useOfFunds}</Text>

                <Text style={[styles.reviewLabel, { marginTop: 16 }]}>Documents:</Text>
                <Text style={styles.reviewValue}>{documentsCompleted}/{documents.length} received</Text>

                {eligibilitySummary && (
                    <>
                        <Text style={[styles.reviewLabel, { marginTop: 16 }]}>Pre-check:</Text>
                        <Text style={styles.reviewValue}>{eligibilitySummary}</Text>
                    </>
                )}

                <Text style={[styles.reviewLabel, { marginTop: 16 }]}>Sync:</Text>
                <Text style={styles.reviewValue}>{lastSavedLabel}</Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={18} color={theme.colors.primary} />
                    <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Loan Application</Text>
                <View style={{ width: 60 }} />
            </View>

            {renderPerformanceStrip()}
            {renderProgressBar()}

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {currentStep === 0 && renderEligibility()}
                {currentStep === 1 && !application && renderProductSelection()}
                {currentStep === 1 && application && renderBusinessInfo()}
                {currentStep === 2 && renderLoanDetails()}
                {currentStep === 3 && renderDocuments()}
                {currentStep === TOTAL_FORM_STEPS && renderReview()}
            </ScrollView>

            {currentStep > 0 && (
                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[styles.footerButton, styles.secondaryButton]}
                        onPress={handlePrevStep}
                    >
                        <Text style={styles.secondaryButtonText}>Previous</Text>
                    </TouchableOpacity>

                    {currentStep < TOTAL_FORM_STEPS ? (
                        <TouchableOpacity
                            style={[styles.footerButton, styles.primaryButton]}
                            onPress={handleNextStep}
                        >
                            <Text style={styles.primaryButtonText}>Next Step</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            style={[styles.footerButton, styles.submitButton]}
                            onPress={handleSubmit}
                            disabled={saving}
                        >
                            {saving ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.submitButtonText}>Submit Application</Text>
                            )}
                        </TouchableOpacity>
                    )}
                </View>
            )}
            <AssistantBubble context="application" />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        padding: theme.spacing.lg,
    },
    title: {
        ...theme.typography.h1,
        marginBottom: theme.spacing.xs,
    },
    subtitle: {
        ...theme.typography.body,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.xl,
    },
    card: {
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.lg,
        borderRadius: theme.borderRadius.lg,
        marginBottom: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadows.card,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.primary,
    },
    cardDesc: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        lineHeight: 20,
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
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButtonText: {
        color: theme.colors.primary,
        fontSize: 16,
        marginLeft: 4,
        fontWeight: '600',
    },
    metaStrip: {
        paddingHorizontal: theme.spacing.lg,
        paddingTop: theme.spacing.md,
        backgroundColor: theme.colors.background,
        flexDirection: 'row',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        rowGap: theme.spacing.sm,
    },
    metaCard: {
        flex: 1,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        marginRight: theme.spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginBottom: theme.spacing.sm,
    },
    metaCardBody: {
        marginLeft: theme.spacing.sm,
        flex: 1,
    },
    metaLabel: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginBottom: 2,
    },
    metaValue: {
        fontSize: 14,
        color: theme.colors.text,
        fontWeight: '600',
    },
    progressContainer: {
        padding: theme.spacing.lg,
        backgroundColor: theme.colors.surface,
    },
    progressBarBackground: {
        height: 8,
        backgroundColor: theme.colors.border,
        borderRadius: 4,
        marginBottom: theme.spacing.xs,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: theme.colors.success,
        borderRadius: 4,
    },
    stepText: {
        textAlign: 'right',
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    scrollContent: {
        padding: theme.spacing.lg,
    },
    stepContainer: {
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.xl,
        borderRadius: theme.borderRadius.lg,
        ...theme.shadows.card,
    },
    stepTitle: {
        ...theme.typography.h2,
        marginBottom: theme.spacing.xs,
    },
    stepDescription: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.xl,
    },
    inputGroup: {
        marginBottom: theme.spacing.lg,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
    },
    input: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        fontSize: 16,
        backgroundColor: theme.colors.background,
        color: theme.colors.text,
    },
    eligibilityBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#e8f5e9',
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        marginTop: theme.spacing.sm,
        borderWidth: 1,
        borderColor: theme.colors.success,
    },
    eligibilityText: {
        marginLeft: theme.spacing.sm,
        color: theme.colors.text,
        flex: 1,
    },
    button: {
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
        marginTop: theme.spacing.md,
    },
    primaryButton: {
        backgroundColor: theme.colors.primary,
        flex: 1,
        marginLeft: theme.spacing.sm,
    },
    primaryButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    footer: {
        padding: theme.spacing.lg,
        backgroundColor: theme.colors.surface,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    footerButton: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: theme.borderRadius.md,
        minWidth: 100,
        alignItems: 'center',
    },
    secondaryButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginRight: theme.spacing.sm,
    },
    secondaryButtonText: {
        color: theme.colors.text,
        fontWeight: '600',
        fontSize: 16,
    },
    submitButton: {
        backgroundColor: theme.colors.success,
        flex: 1,
        marginLeft: theme.spacing.sm,
    },
    submitButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    reviewCard: {
        backgroundColor: theme.colors.background,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    reviewLabel: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginTop: 8,
    },
    reviewValue: {
        fontSize: 16,
        color: theme.colors.text,
        fontWeight: '500',
    },
    docUploadRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    docInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    docTextGroup: {
        marginLeft: theme.spacing.md,
    },
    docName: {
        marginLeft: 0,
        fontSize: 16,
        color: theme.colors.text,
    },
    docHint: {
        marginLeft: 0,
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    uploadButton: {
        backgroundColor: theme.colors.background,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: theme.colors.primary,
    },
    uploadButtonText: {
        color: theme.colors.primary,
        fontSize: 12,
        fontWeight: '600',
    },
    uploadButtonComplete: {
        backgroundColor: 'rgba(56, 142, 60, 0.12)',
        borderColor: theme.colors.success,
    },
    uploadButtonTextComplete: {
        color: theme.colors.success,
    },
    microCopy: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.sm,
    },
});


