import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator, Share, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';
import { auth, db } from '../../firebaseConfig';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { flushPendingApplicationWrites } from '../services/applications';
import { applicationStore, ApplicationStoreState } from '../services/applicationStore';
import { Application, SyncStatus, Task } from '../types';

import SyncStatusBadge from '../components/SyncStatusBadge';
import QuickApplySheet from '../components/QuickApplySheet';
import AssistantBubble from '../components/AssistantBubble';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { buildStoragePath, pickDocument, uploadFileFromUri } from '../services/upload';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { FormInput } from '../components/ui/FormInput';
import { DataField } from '../components/ui/DataField';
import { TaskList } from '../components/TaskList';
import { LoanStatusTracker } from '../components/LoanStatusTracker';

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
    const [tasks, setTasks] = useState<Task[]>([]);

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
                // Use functional update or ignore stale currentStep
                setCurrentStep(prev => state.draft?.currentStep ?? prev);

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
    }, []); // Remove currentStep dependency to avoid re-subscribing and resetting state

    const refreshTasks = async () => {
        // In a real app, this might trigger a cloud function to sync tasks from Ventures
        // For now, it's a no-op as the subscription handles updates
    };

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

            // Sync to store if we have a draft
            if (application) {
                applicationStore.setStep(1);
            }
            return;
        }

        if (!application) {
            Alert.alert("Start Application", "Please pick a loan product to continue.");
            return;
        }

        if (currentStep === 1 && application) {
            // Validate Business Info
            if (!application.businessName?.trim()) {
                Alert.alert("Required", "Please enter your Legal Business Name.");
                return;
            }
            if (!application.yearsInBusiness || application.yearsInBusiness <= 0) {
                Alert.alert("Required", "Please enter valid Years in Business.");
                return;
            }
            if (!application.annualRevenue || application.annualRevenue <= 0) {
                Alert.alert("Required", "Please enter valid Annual Revenue.");
                return;
            }
        }

        if (currentStep === 2) {
            // Validate Loan Details
            if (!application?.loanAmount || application.loanAmount <= 0) {
                Alert.alert("Required", "Please enter a valid Loan Amount.");
                return;
            }
            if (!application?.useOfFunds?.trim()) {
                Alert.alert("Required", "Please describe the Use of Funds.");
                return;
            }
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
            const path = buildStoragePath({
                userId: application.id, // Using application ID as user ID context for now, or auth.currentUser.uid
                applicationId: application.id,
                docId,
                fileName: picked.name
            });

            const uploadResult = await uploadFileFromUri({
                uri: picked.uri,
                path,
                name: picked.name,
                mimeType: picked.mimeType
            });

            const updatedDocs: DocumentRequirement[] = documents.map(doc =>
                doc.id === docId
                    ? {
                        ...doc,
                        status: 'completed' as const,
                        uploaded: true,
                        downloadUrl: uploadResult.downloadUrl,
                        size: uploadResult.size,
                        contentType: uploadResult.contentType,
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

                // Trigger Brain Analysis
                try {
                    const { getAuth } = await import('firebase/auth');
                    const { API_URL } = await import('../config');
                    const token = await getAuth().currentUser?.getIdToken();

                    if (token) {
                        fetch(`${API_URL}/documents/analyze`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({
                                documentId: docId,
                                fileName: picked.name,
                                content: uploadResult.downloadUrl
                            })
                        }).then(() => {
                            Alert.alert("Analysis Started", "The Brain is processing your document to extract key info.");
                        }).catch(err => console.error("Analysis trigger failed", err));
                    }
                } catch (err) {
                    console.error("Analysis trigger setup failed", err);
                }
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

        try {
            await applicationStore.submit();
            Alert.alert(
                "Application Submitted!",
                "Your application has been received. A loan officer will review it shortly.",
                [{ text: "Back to Home", onPress: () => navigation.navigate('Home') }]
            );
        } catch (error) {
            Alert.alert("Submission Failed", "Please try again later.");
        }
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
            <Text style={styles.title}>Select Loan Product</Text>
            <Text style={styles.subtitle}>Choose the financing that fits your goals.</Text>

            {/* Quick Apply CTA */}
            <TouchableOpacity style={styles.quickApplyBanner} onPress={() => setShowQuickApply(true)}>
                <View style={styles.quickApplyIcon}>
                    <Ionicons name="flash" size={20} color="white" />
                </View>
                <View style={styles.quickApplyText}>
                    <Text style={styles.quickApplyTitle}>Quick Apply</Text>
                    <Text style={styles.quickApplyDesc}>Get started in 30 seconds</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.success} />
            </TouchableOpacity>

            <Text style={styles.orDivider}>AVAILABLE PRODUCTS</Text>

            <TouchableOpacity style={styles.productCard} onPress={() => handleStartNew('sba_504')}>
                <View style={styles.productIcon}>
                    <Ionicons name="business" size={28} color={theme.colors.primary} />
                </View>
                <View style={styles.productInfo}>
                    <Text style={styles.productTitle}>SBA 504 Loan</Text>
                    <Text style={styles.productDesc}>Fixed assets, real estate, and equipment.</Text>
                    <View style={styles.productTag}>
                        <Text style={styles.productTagText}>POPULAR</Text>
                    </View>
                </View>
                <Ionicons name="arrow-forward" size={20} color={theme.colors.border} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.productCard} onPress={() => handleStartNew('sba_7a')}>
                <View style={styles.productIcon}>
                    <Ionicons name="cash" size={28} color={theme.colors.primary} />
                </View>
                <View style={styles.productInfo}>
                    <Text style={styles.productTitle}>SBA 7(a) Loan</Text>
                    <Text style={styles.productDesc}>Working capital and debt refinancing.</Text>
                </View>
                <Ionicons name="arrow-forward" size={20} color={theme.colors.border} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.productCard, styles.productCardDisabled]} onPress={() => Alert.alert("Coming Soon", "Community Lending applications will be available soon!")}>
                <View style={[styles.productIcon, { backgroundColor: '#F3F4F6' }]}>
                    <Ionicons name="people" size={28} color={theme.colors.textSecondary} />
                </View>
                <View style={styles.productInfo}>
                    <Text style={[styles.productTitle, { color: theme.colors.textSecondary }]}>Community Lending</Text>
                    <Text style={styles.productDesc}>Microloans for small businesses.</Text>
                    <View style={styles.comingSoonTag}>
                        <Text style={styles.comingSoonText}>SOON</Text>
                    </View>
                </View>
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

    const renderStepIndicator = () => {
        if (currentStep === 0) return null;
        const steps = ['Info', 'Loan', 'Docs', 'Review'];
        return (
            <View style={styles.stepIndicatorContainer}>
                {steps.map((label, index) => {
                    const stepNum = index + 1;
                    const isActive = stepNum === currentStep;
                    const isCompleted = stepNum < currentStep;
                    return (
                        <View key={index} style={styles.stepItem}>
                            <View style={[
                                styles.stepCircle,
                                isActive && styles.stepCircleActive,
                                isCompleted && styles.stepCircleCompleted
                            ]}>
                                {isCompleted ? (
                                    <Ionicons name="checkmark" size={12} color="white" />
                                ) : (
                                    <Text style={[styles.stepNumber, isActive && styles.stepNumberActive]}>{stepNum}</Text>
                                )}
                            </View>
                            <Text style={[styles.stepLabel, isActive && styles.stepLabelActive]}>{label}</Text>
                            {index < steps.length - 1 && (
                                <View style={[styles.stepLine, isCompleted && styles.stepLineCompleted]} />
                            )}
                        </View>
                    );
                })}
            </View>
        );
    };

    // ... inside render ...
    // Replace renderProgressBar() with renderStepIndicator()


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

    if (application && application.status !== 'draft') {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="chevron-back" size={18} color={theme.colors.primary} />
                        <Text style={styles.backButtonText}>Back</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Application Status</Text>
                    <View style={{ width: 60 }} />
                </View>
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <LoanStatusTracker status={application.status} />
                    <View style={{ height: 20 }} />
                    <TaskList tasks={tasks} onRefresh={refreshTasks} />
                </ScrollView>
                <AssistantBubble context="application" />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={18} color={theme.colors.primary} />
                    <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Loan Application</Text>
                <TouchableOpacity onPress={flushSave} style={styles.saveButton}>
                    <Text style={styles.saveButtonText}>Save Draft</Text>
                </TouchableOpacity>
            </View>

            {renderPerformanceStrip()}
            {renderStepIndicator()}

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
        fontSize: 24,
        fontWeight: '700',
        color: theme.colors.text,
        letterSpacing: -0.5,
        lineHeight: 32,
        marginBottom: theme.spacing.xs,
    },
    subtitle: {
        fontSize: 15,
        color: theme.colors.textSecondary,
        lineHeight: 22,
        marginBottom: theme.spacing.xl,
    },
    card: {
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.lg,
        borderRadius: 8, // Sharper corners
        marginBottom: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        // Flat design - no shadow
        shadowColor: 'transparent',
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
        letterSpacing: -0.5,
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
        fontSize: 16, // Smaller, tighter header
        fontWeight: '700',
        color: theme.colors.text,
        letterSpacing: -0.3,
    },
    backButton: {
        padding: theme.spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButtonText: {
        color: theme.colors.primary,
        fontSize: 14,
        marginLeft: 4,
        fontWeight: '600',
    },
    saveButton: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        backgroundColor: theme.colors.surfaceHighlight,
        borderRadius: 4, // Sharper
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    saveButtonText: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.text,
    },

    stepIndicatorContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: theme.spacing.md,
        backgroundColor: theme.colors.background,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    stepItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    stepCircle: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: theme.colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    stepCircleActive: {
        backgroundColor: theme.colors.text,
        borderColor: theme.colors.text,
    },
    stepCircleCompleted: {
        backgroundColor: theme.colors.success,
        borderColor: theme.colors.success,
    },
    stepNumber: {
        fontSize: 10,
        color: theme.colors.textSecondary,
        fontWeight: '600',
    },
    stepNumberActive: {
        color: 'white',
    },
    stepLabel: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        marginLeft: 6,
        marginRight: 6,
        fontWeight: '500',
        letterSpacing: -0.2,
    },
    stepLabelActive: {
        color: theme.colors.text,
        fontWeight: '700',
    },
    stepLine: {
        width: 24,
        height: 1,
        backgroundColor: theme.colors.border,
        marginRight: 6,
    },
    stepLineCompleted: {
        backgroundColor: theme.colors.success,
    },

    productCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.lg,
        borderRadius: 8, // Sharper
        marginBottom: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    productCardDisabled: {
        opacity: 0.6,
        backgroundColor: '#F9FAFB',
    },
    productIcon: {
        width: 40,
        height: 40,
        borderRadius: 6, // Square-ish
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    productInfo: {
        flex: 1,
    },
    productTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: 2,
        letterSpacing: -0.3,
    },
    productDesc: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        lineHeight: 18,
    },
    productTag: {
        backgroundColor: theme.colors.text, // Black tag
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 2,
        alignSelf: 'flex-start',
        marginTop: 6,
    },
    productTagText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: 'white',
        textTransform: 'uppercase',
    },
    comingSoonTag: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 2,
        alignSelf: 'flex-start',
        marginTop: 6,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    comingSoonText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: theme.colors.textSecondary,
        textTransform: 'uppercase',
    },
    metaStrip: {
        backgroundColor: theme.colors.background,
        flexDirection: 'row',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    metaCard: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: theme.spacing.md,
    },
    metaCardBody: {
        marginLeft: theme.spacing.xs,
    },
    metaLabel: {
        fontSize: 10,
        color: theme.colors.textSecondary,
        textTransform: 'uppercase',
        fontWeight: '600',
    },
    metaValue: {
        fontSize: 12,
        color: theme.colors.text,
        fontWeight: '600',
        fontFamily: Platform.select({ ios: 'Courier', android: 'monospace' }), // Monospace for data
    },
    progressContainer: {
        padding: theme.spacing.lg,
        backgroundColor: theme.colors.surface,
    },
    progressBarBackground: {
        height: 4,
        backgroundColor: theme.colors.border,
        borderRadius: 2,
        marginBottom: theme.spacing.xs,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: theme.colors.text, // Black progress bar
        borderRadius: 2,
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
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    stepTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.text,
        letterSpacing: -0.5,
        marginBottom: theme.spacing.xs,
        textTransform: 'uppercase',
    },
    stepDescription: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.xl,
        lineHeight: 20,
    },
    label: {
        fontSize: 12,
        fontWeight: '700',
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.xs,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    eligibilityBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0FDF4',
        borderRadius: 4,
        padding: theme.spacing.md,
        marginTop: theme.spacing.sm,
        borderWidth: 1,
        borderColor: theme.colors.success,
    },
    eligibilityText: {
        marginLeft: theme.spacing.sm,
        color: theme.colors.text,
        flex: 1,
        fontSize: 13,
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
        borderRadius: 4,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    docUploadRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
        padding: 12,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 4,
        backgroundColor: theme.colors.surface,
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
        fontSize: 10,
        color: theme.colors.primary,
        marginTop: 2,
        fontFamily: Platform.select({ ios: 'Courier', android: 'monospace' }),
    },
    microCopy: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.sm,
        textAlign: 'center',
    },
    handoffCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: theme.spacing.md,
        padding: 12,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 4,
        backgroundColor: '#F9FAFB',
    },
    handoffTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: theme.colors.text,
        textTransform: 'uppercase',
    },
    handoffHint: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        marginTop: 4,
    },
    handoffLink: {
        fontSize: 11,
        color: theme.colors.primary,
        marginTop: 4,
        fontFamily: Platform.select({ ios: 'Courier', android: 'monospace' }),
    },
    quickApplyBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.text, // High contrast
        borderRadius: 4,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.lg,
    },
    quickApplyContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    quickApplyIcon: {
        width: 32,
        height: 32,
        borderRadius: 4,
        backgroundColor: theme.colors.text,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme.spacing.md,
    },
    quickApplyText: {
        marginLeft: theme.spacing.md,
        flex: 1,
    },
    quickApplyTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.text,
        letterSpacing: -0.5,
    },
    quickApplyDesc: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    orDivider: {
        textAlign: 'center',
        color: theme.colors.textSecondary,
        fontSize: 11,
        fontWeight: '600',
        marginBottom: theme.spacing.md,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    divider: {
        height: 1,
        backgroundColor: theme.colors.border,
        marginVertical: theme.spacing.md,
    },
});
