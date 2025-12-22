import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { useToast } from '../context/ToastContext';
import { auth, db } from '../../firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const FICO_RANGES = [
    { label: 'Excellent (750+)', value: '750+' },
    { label: 'Good (700-749)', value: '700-749' },
    { label: 'Fair (650-699)', value: '650-699' },
    { label: 'Challenged (Below 650)', value: 'Below 650' },
    { label: 'I don\'t know', value: 'unknown' }
];

const PURPOSE_OPTIONS = [
    { label: 'Working Capital', value: 'working_capital' },
    { label: 'Equipment Purchase', value: 'equipment' },
    { label: 'Real Estate', value: 'real_estate' },
    { label: 'Refinancing', value: 'refinance' },
    { label: 'Other', value: 'other' }
];

export default function PreliminaryIntakeScreen({ navigation }: any) {
    const { showToast } = useToast();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [showInfo, setShowInfo] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        fullName: auth.currentUser?.displayName || '',
        email: auth.currentUser?.email || '',
        ficoRange: '',
        loanAmountDesired: '',
        businessIndustry: '',
        yearsInBusiness: '',
        purpose: '',
    });

    const updateForm = (key: string, value: string) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const handleNext = () => {
        if (step === 2 && !formData.ficoRange) {
            Alert.alert("Required", "Please select your FICO range.");
            return;
        }
        if (step < 5) setStep(step + 1);
    };

    const handleBack = () => {
        if (step > 1) setStep(step - 1);
        else navigation.goBack();
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const leadsRef = collection(db, 'preliminary_leads');
            await addDoc(leadsRef, {
                ...formData,
                userId: auth.currentUser?.uid,
                loanAmountDesired: parseFloat(formData.loanAmountDesired) || 0,
                yearsInBusiness: parseInt(formData.yearsInBusiness) || 0,
                status: 'new',
                createdAt: serverTimestamp()
            });

            showToast({
                message: "Inquiry Submitted! Our team will reach out soon.",
                type: 'success'
            });
            navigation.navigate('HomeTab');
        } catch (error) {
            console.error("Submission error", error);
            Alert.alert("Error", "Failed to submit. Please try again later.");
        } finally {
            setLoading(false);
        }
    };

    const renderStepContent = () => {
        switch (step) {
            case 1:
                return (
                    <View style={styles.stepContainer}>
                        <Text style={styles.stepTitle}>Let's start with basics</Text>
                        <Text style={styles.stepSubtitle}>Confirm your contact info so we can reach you.</Text>

                        <Text style={styles.label}>Full Name</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.fullName}
                            onChangeText={(v) => updateForm('fullName', v)}
                            placeholder="Your Name"
                        />

                        <Text style={styles.label}>Email Address</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.email}
                            onChangeText={(v) => updateForm('email', v)}
                            placeholder="email@example.com"
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                    </View>
                );
            case 2:
                return (
                    <View style={styles.stepContainer}>
                        <View style={styles.labelRow}>
                            <Text style={styles.stepTitle}>Credit Health</Text>
                            <TouchableOpacity onPress={() => setShowInfo(showInfo === 'fico' ? null : 'fico')}>
                                <Ionicons name="information-circle-outline" size={20} color={theme.colors.primary} />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.stepSubtitle}>Select your estimated FICO score range. We won't pull your credit yet.</Text>

                        {showInfo === 'fico' && (
                            <View style={styles.infoBox}>
                                <Text style={styles.infoText}>
                                    Your FICO score helps us determine which loan programs (SBA, Microloan, etc.) you qualify for. "Challenged" credit doesn't mean a denial—we have special programs for rebuilders!
                                </Text>
                            </View>
                        )}

                        {FICO_RANGES.map((range) => (
                            <TouchableOpacity
                                key={range.value}
                                style={[styles.optionCard, formData.ficoRange === range.value && styles.optionCardActive]}
                                onPress={() => updateForm('ficoRange', range.value)}
                            >
                                <Text style={[styles.optionLabel, formData.ficoRange === range.value && styles.optionLabelActive]}>
                                    {range.label}
                                </Text>
                                {formData.ficoRange === range.value && (
                                    <Ionicons name="checkmark-circle" size={24} color="#fff" />
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                );
            case 3:
                return (
                    <View style={styles.stepContainer}>
                        <Text style={styles.stepTitle}>Loan Requirements</Text>
                        <Text style={styles.stepSubtitle}>What are you looking for?</Text>

                        <Text style={styles.label}>Desired Loan Amount ($)</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.loanAmountDesired}
                            onChangeText={(v) => updateForm('loanAmountDesired', v)}
                            placeholder="e.g. 50000"
                            keyboardType="numeric"
                        />

                        <Text style={styles.label}>Primary Purpose</Text>
                        <View style={styles.optionsGrid}>
                            {PURPOSE_OPTIONS.map((opt) => (
                                <TouchableOpacity
                                    key={opt.value}
                                    style={[styles.chip, formData.purpose === opt.value && styles.chipActive]}
                                    onPress={() => updateForm('purpose', opt.value)}
                                >
                                    <Text style={[styles.chipText, formData.purpose === opt.value && styles.chipTextActive]}>
                                        {opt.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                );
            case 4:
                return (
                    <View style={styles.stepContainer}>
                        <Text style={styles.stepTitle}>Business Basics</Text>
                        <Text style={styles.stepSubtitle}>Tell us about your company.</Text>

                        <Text style={styles.label}>Industry</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.businessIndustry}
                            onChangeText={(v) => updateForm('businessIndustry', v)}
                            placeholder="e.g. Retail, Tech, HVAC"
                        />

                        <View style={styles.labelRow}>
                            <Text style={styles.label}>Years in Business</Text>
                            <TouchableOpacity onPress={() => setShowInfo(showInfo === 'years' ? null : 'years')}>
                                <Ionicons name="information-circle-outline" size={16} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        {showInfo === 'years' && (
                            <View style={styles.infoBoxSubtle}>
                                <Text style={styles.infoTextSubtle}>
                                    Startups (under 2 years) often require different documentation than established businesses.
                                </Text>
                            </View>
                        )}
                        <TextInput
                            style={styles.input}
                            value={formData.yearsInBusiness}
                            onChangeText={(v) => updateForm('yearsInBusiness', v)}
                            placeholder="e.g. 2"
                            keyboardType="numeric"
                        />
                    </View>
                );
            case 5:
                return (
                    <View style={styles.stepContainer}>
                        <Text style={styles.stepTitle}>Review Your Request</Text>
                        <Text style={styles.stepSubtitle}>Double check before sending to our team.</Text>

                        <View style={styles.reviewCard}>
                            <ReviewItem label="FICO" value={FICO_RANGES.find(r => r.value === formData.ficoRange)?.label || 'Not set'} />
                            <ReviewItem label="Amount" value={`$${formData.loanAmountDesired}`} />
                            <ReviewItem label="Industry" value={formData.businessIndustry} />
                            <ReviewItem label="Years" value={formData.yearsInBusiness} />
                            <ReviewItem label="Purpose" value={PURPOSE_OPTIONS.find(o => o.value === formData.purpose)?.label || 'Other'} />
                        </View>
                    </View>
                );
            default:
                return null;
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
                </TouchableOpacity>
                <View style={styles.progressContainer}>
                    <View style={[styles.progressBar, { width: `${(step / 5) * 100}%` }]} />
                </View>
                <View style={{ width: 40 }} />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    {renderStepContent()}
                </ScrollView>
            </KeyboardAvoidingView>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={styles.nextBtn}
                    onPress={step === 5 ? handleSubmit : handleNext}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Text style={styles.nextBtnText}>{step === 5 ? 'Submit Inquiry' : 'Next'}</Text>
                            {step < 5 && <Ionicons name="arrow-forward" size={20} color="#fff" />}
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const ReviewItem = ({ label, value }: { label: string, value: string }) => (
    <View style={styles.reviewItem}>
        <Text style={styles.reviewLabel}>{label}</Text>
        <Text style={styles.reviewValue}>{value || '—'}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        height: 60,
    },
    backBtn: {
        padding: 8,
    },
    progressContainer: {
        flex: 1,
        height: 6,
        backgroundColor: '#eee',
        borderRadius: 3,
        marginHorizontal: 16,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: theme.colors.primary,
    },
    scrollContent: {
        padding: 24,
    },
    stepContainer: {
        flex: 1,
    },
    stepTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 8,
    },
    stepSubtitle: {
        fontSize: 16,
        color: '#666',
        lineHeight: 22,
        marginBottom: 32,
    },
    label: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
        marginTop: 16,
    },
    input: {
        backgroundColor: '#f8f9fa',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: theme.colors.text,
    },
    optionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#f8f9fa',
        padding: 20,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#eee',
    },
    optionCardActive: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    optionLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
    },
    optionLabelActive: {
        color: '#fff',
    },
    optionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginTop: 8,
    },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: '#f0f0f0',
        borderWidth: 1,
        borderColor: '#ddd',
    },
    chipActive: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    chipText: {
        fontSize: 14,
        color: '#666',
    },
    chipTextActive: {
        color: '#fff',
        fontWeight: 'bold',
    },
    reviewCard: {
        backgroundColor: '#f8f9fa',
        padding: 20,
        borderRadius: 16,
        gap: 16,
    },
    reviewItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    reviewLabel: {
        color: '#666',
        fontSize: 14,
    },
    reviewValue: {
        fontWeight: 'bold',
        color: theme.colors.text,
        fontSize: 14,
    },
    footer: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    nextBtn: {
        backgroundColor: theme.colors.primary,
        height: 56,
        borderRadius: 28,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        ...theme.shadows.card,
    },
    nextBtnText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    infoBox: {
        backgroundColor: '#EBF5FF',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
        borderLeftWidth: 4,
        borderLeftColor: '#3B82F6',
    },
    infoText: {
        fontSize: 13,
        color: '#1E40AF',
        lineHeight: 18,
    },
    infoBoxSubtle: {
        backgroundColor: '#F9FAFB',
        padding: 10,
        borderRadius: 8,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    infoTextSubtle: {
        fontSize: 12,
        color: '#4B5563',
        lineHeight: 16,
        fontStyle: 'italic',
    },
});
