import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator, Share, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';
import { auth } from '../../firebaseConfig';
import { flushPendingApplicationWrites } from '../services/applications';
import { applicationStore, ApplicationStoreState } from '../services/applicationStore';
import { Application, SyncStatus } from '../types';
import AssistantBubble from '../components/AssistantBubble';
import SyncStatusBadge from '../components/SyncStatusBadge';
import QuickApplySheet from '../components/QuickApplySheet';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { buildStoragePath, pickDocument, uploadFileFromUri } from '../services/upload';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { FormInput } from '../components/ui/FormInput';
import { DataField } from '../components/ui/DataField';

type DocumentRequirement = {
    id: string;
    name: string;
    description: string;
    uploaded?: boolean;
    uploadedAt?: string;
    status?: 'pending' | 'uploading' | 'completed' | 'failed';
    downloadUrl?: string;
    size?: number;
    fileName?: string;
    contentType?: string;
};

const TOTAL_FORM_STEPS = 4;
const REQUIRED_DOCUMENTS: DocumentRequirement[] = [
    {
        id: 'tax_returns',
        name: 'Tax Returns (Last 2 Years)',
        description: 'PDF upload - 10MB max',
        status: 'pending',
    },
    {
        id: 'p_and_l',
        name: 'P&L Statement',
        description: 'Most recent 12 months',
        status: 'pending',
    },
    {
        id: 'balance_sheet',
        name: 'Balance Sheet',
        description: 'Year-to-date',
        status: 'pending',
    },
];

export default function ApplicationScreen() {
    // OPTIMISTIC: No blocking loading state - render immediately
    const [application, setApplication] = useState<Application | null>(() => applicationStore.getCachedDraft());
    const [syncStatus, setSyncStatus] = useState<SyncStatus>(applicationStore.getSyncStatus());
    const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
    const [currentStep, setCurrentStep] = useState(application?.currentStep ?? 0);
    const [isHydrating, setIsHydrating] = useState(true);
    const navigation = useNavigation<any>();

    // Quick Apply Sheet
    const [showQuickApply, setShowQuickApply] = useState(false);

    // Eligibility State
    const [eligibility, setEligibility] = useState({
        yearsInBusiness: '',
        creditScore: '',
        bankruptcy: false,
    });
    const [documents, setDocuments] = useState<DocumentRequirement[]>(REQUIRED_DOCUMENTS.map(doc => ({ ...doc, status: 'pending' as const })));
    const [eligibilitySummary, setEligibilitySummary] = useState<string | null>(null);
    const [handoffLink, setHandoffLink] = useState<string | null>(null);

    const documentsCompleted = useMemo(
        () => documents.filter(doc => doc.uploaded).length,
        [documents]
    );

    // OPTIMISTIC: Subscribe to store updates
    useEffect(() => {
        const unsubscribe = applicationStore.subscribe((state: ApplicationStoreState) => {
            setApplication(state.draft);
            setSyncStatus(state.syncStatus);
            setLastSyncedAt(state.lastSyncedAt);

            if (state.draft) {
                setCurrentStep(state.draft.currentStep ?? currentStep);
                if (state.draft.data?.documents) {
                    setDocuments((state.draft.data.documents as DocumentRequirement[]).map(doc => ({
                        ...doc,
                        status: (doc.uploaded ? 'completed' : 'pending') as DocumentRequirement['status'],
                    })));
                }
                if (state.draft.data?.eligibilitySummary) {
                    setEligibilitySummary(state.draft.data.eligibilitySummary as string);
                }
                setHandoffLink(`https://ampac-mobile.web.app/upload?appId=${state.draft.id}`);
            }
        });

        return unsubscribe;
    }, [currentStep]);

    // OPTIMISTIC: Background hydration - doesn't block render
    useEffect(() => {
        const hydrate = async () => {
            // First, hydrate from local storage (fast)
            await applicationStore.hydrateFromStorage();

            // Then sync with server in background (slow, but non-blocking)
            applicationStore.syncWithServer().finally(() => {
                setIsHydrating(false);
            });
        };

        hydrate();
        flushPendingApplicationWrites();
    }, []);

    // OPTIMISTIC: Updates are instant, saves happen in background
    const updateField = useCallback(<K extends keyof Application>(field: K, value: Application[K]) => {
        applicationStore.updateField(field, value);
    }, []);

    const updateFields = useCallback((fields: Partial<Application>) => {
        applicationStore.updateFields(fields);
    }, []);

    const flushSave = useCallback(async () => {
        await applicationStore.flushSave();
    }, []);

    // OPTIMISTIC: Create draft instantly, sync in background
    const handleStartNew = (type: 'sba_504' | 'sba_7a') => {
        const baselineDocs = REQUIRED_DOCUMENTS.map(doc => ({ ...doc, status: 'pending' as const }));

        const newApp = applicationStore.createDraft(type, {
            data: {
                documents: baselineDocs,
                eligibilitySummary,
            },
        });

        setDocuments(baselineDocs);
        setCurrentStep(1);
        setHandoffLink(`https://ampac-mobile.web.app/upload?appId=${newApp.id}`);
    };

    // Quick Apply success handler
    const handleQuickApplySuccess = () => {
        setShowQuickApply(false);
        Alert.alert(
            "Application Submitted!",
            "We've received your quick application. A loan officer will contact you shortly. You can complete the full application anytime.",
            [{ text: "Back to Home", onPress: () => navigation.navigate('Home') }]
        );
    };

    // OPTIMISTIC: Field updates are instant
    const handleUpdateField = (field: keyof Application, value: any) => {
        if (!application) return;
        updateField(field, value);
    };

    // OPTIMISTIC: Step transitions are instant, saves happen in background
    const handleNextStep = () => {
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

            const summary = (score >= 680 && years >= 2)
                ? "Pre-qualified for SBA 504 & 7(a). Excellent standing."
                : "On track for SBA pre-check. Continue to product selection.";
            setEligibilitySummary(summary);

            // INSTANT: Move to step 1
            setCurrentStep(1);
            return;
        }

        if (!application) {
            Alert.alert("Start Application", "Please pick a loan product to continue.");
            return;
        }

        const nextStep = Math.min(currentStep + 1, TOTAL_FORM_STEPS);
        // INSTANT: Update UI immediately
        setCurrentStep(nextStep);
        // BACKGROUND: Persist asynchronously
        applicationStore.setStep(nextStep);
    };

    // OPTIMISTIC: Instant step transition
    const handlePrevStep = () => {
        if (!application) {
            if (currentStep > 0) setCurrentStep(prev => prev - 1);
            return;
        }

        const prevStep = Math.max(currentStep - 1, 0);
        // INSTANT: Update UI immediately
        setCurrentStep(prevStep);
        // BACKGROUND: Persist asynchronously
        applicationStore.setStep(prevStep);
    };

    const handleUploadDoc = async (docId: string) => {
        if (!application) {
            Alert.alert("Start an application", "Please pick a loan product first.");
            return;
        }
        const docMeta = documents.find(d => d.id === docId);
        const picked = await pickDocument();
        if (!picked) {
            return;
        }

        const nextDocs: DocumentRequirement[] = documents.map(doc =>
            doc.id === docId
                ? {
                    ...doc,
                    status: 'uploading' as const,
                    uploaded: false,
                    fileName: picked.name,
                    size: picked.size,
                    contentType: picked.mimeType,
                }
                : doc
        );
        setDocuments(nextDocs);

        try {
            const path = buildStoragePath(application.id, docId, picked.name);
            const downloadUrl = await uploadFileFromUri(picked.uri, path);

            const updatedDocs: DocumentRequirement[] = documents.map(doc =>
                doc.id === docId
                    ? {
                        ...doc,
                        status: 'completed' as const,
                        uploaded: true,
                        downloadUrl,
                        uploadedAt: new Date().toISOString(),
                    }
                    : doc
            );
            setDocuments(updatedDocs);
            if (application) {
                // OPTIMISTIC: Update documents in store
                applicationStore.updateFields({
                    data: { ...(application.data || {}), documents: updatedDocs },
                });
            }
        } catch (error) {
            console.error("Upload failed", error);
            Alert.alert("Upload failed", "Please try again or check your connection.");
            const failedDocs: DocumentRequirement[] = documents.map(doc =>
                doc.id === docId ? { ...doc, status: 'failed' as const } : doc
            );
            setDocuments(failedDocs);
        }
    };

    const handleSubmit = async () => {
        if (!application) return;

        // Flush any pending saves before submit
        await flushSave();

        // Update status to submitted
        applicationStore.updateField('status', 'submitted');

        Alert.alert(
            "Application submitted",
            "Your application has been received. A loan officer will review it shortly.",
            [{ text: "Back to Home", onPress: () => navigation.navigate('Home') }]
        );
    };

    // Step 0: Eligibility
    const renderEligibility = () => (
        <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>ELIGIBILITY CHECK</Text>
            <Text style={styles.stepDescription}>Answer a few quick questions to get started.</Text>

            <FormInput
                label="YEARS IN BUSINESS"
                value={eligibility.yearsInBusiness}
                onChangeText={(text) => setEligibility({ ...eligibility, yearsInBusiness: text })}
                keyboardType="numeric"
                placeholder="e.g. 5"
            />

            <FormInput
                label="ESTIMATED CREDIT SCORE"
                value={eligibility.creditScore}
                onChangeText={(text) => setEligibility({ ...eligibility, creditScore: text })}
                keyboardType="numeric"
                placeholder="e.g. 720"
            />

            {eligibilitySummary && (
                <View style={styles.eligibilityBanner}>
                    <Ionicons name="shield-checkmark" size={18} color={theme.colors.success} />
                    <Text style={styles.eligibilityText}>{eligibilitySummary}</Text>
                </View>
            )}

            <Button
                title="CHECK ELIGIBILITY"
                onPress={handleNextStep}
                style={{ marginTop: theme.spacing.md }}
            />
        </View>
    );

    // Step 1: Product Selection (if no app) OR Business Info (if app exists)
    // Simplified: If no app, show selection. If app, show Business Info.
    const renderProductSelection = () => (
        <View style={styles.content}>
            <Text style={styles.title}>Select a Loan Product</Text>
            <Text style={styles.subtitle}>Based on your needs.</Text>

            {/* Quick Apply CTA */}
            <TouchableOpacity style={styles.quickApplyBanner} onPress={() => setShowQuickApply(true)}>
                <View style={styles.quickApplyContent}>
                    <Ionicons name="flash" size={24} color={theme.colors.success} />
                    <View style={styles.quickApplyText}>
                        <Text style={styles.quickApplyTitle}>Quick Apply</Text>
                        <Text style={styles.quickApplyDesc}>Submit in 30 seconds, complete details later</Text>
                    </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.success} />
            </TouchableOpacity>

            <Text style={styles.orDivider}>— or choose a loan type —</Text>

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
            <Text style={styles.stepTitle}>BUSINESS INFORMATION</Text>
            <Text style={styles.stepDescription}>Tell us about your business entity.</Text>

            <FormInput
                label="LEGAL BUSINESS NAME"
                value={application?.businessName || ''}
                onChangeText={(text) => handleUpdateField('businessName', text)}
                placeholder="e.g. Acme Corp"
            />

            <FormInput
                label="YEARS IN BUSINESS"
                value={application?.yearsInBusiness?.toString() || ''}
                onChangeText={(text) => handleUpdateField('yearsInBusiness', parseInt(text) || 0)}
                keyboardType="numeric"
                placeholder="e.g. 5"
            />

            <FormInput
                label="ANNUAL REVENUE"
                value={application?.annualRevenue?.toString() || ''}
                onChangeText={(text) => handleUpdateField('annualRevenue', parseInt(text) || 0)}
                keyboardType="numeric"
                placeholder="e.g. 500000"
            />
        </View>
    );

    const renderLoanDetails = () => (
        <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>LOAN DETAILS</Text>
            <Text style={styles.stepDescription}>How much do you need and what for?</Text>

            <FormInput
                label="REQUESTED LOAN AMOUNT"
                value={application?.loanAmount?.toString() || ''}
                onChangeText={(text) => handleUpdateField('loanAmount', parseInt(text) || 0)}
                keyboardType="numeric"
                placeholder="e.g. 100000"
            />

            <FormInput
                label="USE OF FUNDS"
                value={application?.useOfFunds || ''}
                onChangeText={(text) => handleUpdateField('useOfFunds', text)}
                multiline
                placeholder="Describe how you will use the loan..."
                style={{ height: 100, textAlignVertical: 'top' }}
            />
        </View>
    );

    const renderDocuments = () => (
        <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>DOCUMENTS</Text>
            <Text style={styles.stepDescription}>Please upload the following documents.</Text>

            {documents.map((doc) => (
                <Card key={doc.id} style={styles.docUploadRow} variant="flat">
                    <View style={styles.docInfo}>
                        <Ionicons
                            name={
                                doc.status === 'completed'
                                    ? "checkmark-circle"
                                    : doc.status === 'uploading'
                                        ? "cloud-upload"
                                        : doc.status === 'failed'
                                            ? "alert-circle"
                                            : "document-text-outline"
                            }
                            size={24}
                            color={
                                doc.status === 'completed'
                                    ? theme.colors.success
                                    : doc.status === 'failed'
                                        ? theme.colors.error
                                        : theme.colors.textSecondary
                            }
                        />
                        <View style={styles.docTextGroup}>
                            <Text style={styles.docName}>{doc.name}</Text>
                            <Text style={styles.docHint}>
                                {doc.status === 'uploading' && 'Uploading...'}
                                {doc.status === 'completed' && (doc.fileName || 'Received')}
                                {doc.status === 'failed' && 'Failed - retry'}
                                {!doc.status && doc.description}
                                {doc.status === 'pending' && doc.description}
                            </Text>
                            {doc.downloadUrl && (
                                <Text style={styles.docUrl} numberOfLines={1}>{doc.downloadUrl}</Text>
                            )}
                        </View>
                    </View>
                    <Button
                        title={doc.status === 'completed' ? 'REPLACE' : doc.status === 'uploading' ? 'UPLOADING' : 'UPLOAD'}
                        onPress={() => handleUploadDoc(doc.id)}
                        variant={doc.status === 'completed' ? 'ghost' : 'secondary'}
                        style={{ height: 32, paddingHorizontal: 12 }}
                        disabled={doc.status === 'uploading'}
                    />
                </Card>
            ))}

            <Card style={styles.handoffCard} variant="flat">
                <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={styles.handoffTitle}>UPLOAD FROM DESKTOP</Text>
                    <Text style={styles.handoffHint}>
                        We'll generate a link so you can drag-and-drop larger files from your computer.
                    </Text>
                    {handoffLink && <Text style={styles.handoffLink} numberOfLines={1}>{handoffLink}</Text>}
                </View>
                <Button
                    title="SEND LINK"
                    onPress={async () => {
                        const link = handoffLink || (application ? `https://ampac-mobile.web.app/upload?appId=${application.id}` : '');
                        if (!link) return;
                        setHandoffLink(link);
                        await Share.share({
                            title: 'Upload documents on desktop',
                            message: `Upload your AmPac docs here: ${link}`,
                        });
                    }}
                    variant="secondary"
                    style={{ height: 32, paddingHorizontal: 12 }}
                />
            </Card>
            <Text style={styles.microCopy}>Real uploads are now stored securely; compression applied to images to speed things up.</Text>
        </View>
    );

    const renderReview = () => (
        <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>REVIEW & SUBMIT</Text>
            <Text style={styles.stepDescription}>Please review your information.</Text>

            <View style={styles.reviewCard}>
                <DataField label="BUSINESS NAME" value={application?.businessName} />
                <DataField label="YEARS IN BUSINESS" value={application?.yearsInBusiness} />
                <DataField label="ANNUAL REVENUE" value={`$${application?.annualRevenue}`} />
                <DataField label="LOAN AMOUNT" value={`$${application?.loanAmount}`} />
                <DataField label="USE OF FUNDS" value={application?.useOfFunds} />

                <View style={styles.divider} />

                <DataField label="DOCUMENTS" value={`${documentsCompleted}/${documents.length} received`} />

                {eligibilitySummary && (
                    <DataField label="PRE-CHECK" value={eligibilitySummary} />
                )}

                <View style={styles.divider} />

                <Text style={styles.label}>SYNC STATUS</Text>
                <SyncStatusBadge status={syncStatus} lastSyncedAt={lastSyncedAt} />
            </View>
        </View>
    );

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
                <SyncStatusBadge status={syncStatus} lastSyncedAt={lastSyncedAt} />
            </View>
            <View style={[styles.metaCard, { marginRight: theme.spacing.sm }]}>
                <Ionicons name="flash" size={20} color={theme.colors.secondary} />
                <View style={styles.metaCardBody}>
                    <Text style={styles.metaLabel}>Mode</Text>
                    <Text style={styles.metaValue}>{isHydrating ? 'Loading...' : 'Instant save'}</Text>
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
                    <Button
                        title="PREVIOUS"
                        onPress={handlePrevStep}
                        variant="ghost"
                        style={{ marginRight: 12 }}
                    />

                    {currentStep < TOTAL_FORM_STEPS ? (
                        <Button
                            title="NEXT STEP"
                            onPress={handleNextStep}
                            style={{ flex: 1 }}
                        />
                    ) : (
                        <Button
                            title={syncStatus === 'syncing' ? 'SUBMITTING...' : 'SUBMIT APPLICATION'}
                            onPress={handleSubmit}
                            disabled={syncStatus === 'syncing'}
                            style={{ flex: 1 }}
                            variant="primary"
                        />
                    )}
                </View>
            )}
            <AssistantBubble context="application" />

            {/* Quick Apply Sheet */}
            <QuickApplySheet
                visible={showQuickApply}
                onClose={() => setShowQuickApply(false)}
                onSuccess={handleQuickApplySuccess}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
    },
    loadingText: {
        marginTop: theme.spacing.md,
        color: theme.colors.textSecondary,
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
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
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
    footer: {
        padding: theme.spacing.lg,
        backgroundColor: theme.colors.surface,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    reviewCard: {
        backgroundColor: theme.colors.background,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    docUploadRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
    },
    docInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    docTextGroup: {
        marginLeft: theme.spacing.md,
        flex: 1,
    },
    docName: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
    },
    docHint: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    docUrl: {
        fontSize: 11,
        color: theme.colors.info,
        marginTop: 2,
    },
    microCopy: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.sm,
    },
    handoffCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: theme.spacing.md,
    },
    handoffTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: theme.colors.text,
    },
    handoffHint: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 4,
    },
    handoffLink: {
        fontSize: 11,
        color: theme.colors.primary,
        marginTop: 4,
    },
    quickApplyBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: theme.colors.success + '15',
        borderWidth: 2,
        borderColor: theme.colors.success,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.lg,
    },
    quickApplyContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    quickApplyText: {
        marginLeft: theme.spacing.md,
        flex: 1,
    },
    quickApplyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.success,
    },
    quickApplyDesc: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    orDivider: {
        textAlign: 'center',
        color: theme.colors.textSecondary,
        fontSize: 13,
        marginBottom: theme.spacing.md,
    },
    divider: {
        height: 1,
        backgroundColor: theme.colors.border,
        marginVertical: theme.spacing.md,
    },
});
