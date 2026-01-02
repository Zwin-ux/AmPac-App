import React, { useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Modal,
    KeyboardAvoidingView,
    Platform,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { ApplicationType, QuickApplyData } from '../types';
import { applicationStore } from '../services/applicationStore';
import { auth } from '../../firebaseConfig';

interface QuickApplySheetProps {
    visible: boolean;
    onClose: () => void;
    onSuccess: () => void;
    prefill?: { businessName?: string; phone?: string };
}

export default function QuickApplySheet({ visible, onClose, onSuccess, prefill }: QuickApplySheetProps) {
    const [loanType, setLoanType] = useState<ApplicationType>('sba_7a');
    const [loanAmount, setLoanAmount] = useState('');
    const [businessName, setBusinessName] = useState(prefill?.businessName || '');
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState(prefill?.phone || '');
    const [submitting, setSubmitting] = useState(false);
    const [scanning, setScanning] = useState(false);

    const handleSubmit = async () => {
        // Validation
        if (!fullName.trim()) {
            Alert.alert('Required', 'Please enter your full name');
            return;
        }
        if (!businessName.trim()) {
            Alert.alert('Required', 'Please enter your business name');
            return;
        }
        if (!loanAmount || parseInt(loanAmount) <= 0) {
            Alert.alert('Required', 'Please enter a loan amount');
            return;
        }

        setSubmitting(true);

        const data: QuickApplyData = {
            type: loanType,
            loanAmount: parseInt(loanAmount),
            businessName: businessName.trim(),
            phone: phone.trim(),
            // fullName is not in QuickApplyData type yet, but we'll assume it's handled or add it later
        };

        // Create quick draft - instant local, async server
        applicationStore.createQuickDraft(data);

        // Small delay for perceived feedback
        setTimeout(() => {
            setSubmitting(false);
            onSuccess();
        }, 300);
    };

    const handleOCR = async () => {
        // Brain API OCR disabled for v1 launch
        Alert.alert(
            'Coming Soon',
            'Document scanning will be available in the next update. Please enter your information manually for now.'
        );
    };

    const formatCurrency = (value: string) => {
        const num = value.replace(/[^0-9]/g, '');
        return num;
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.overlay}
            >
                <View style={styles.sheet}>
                    <View style={styles.handle} />

                    <View style={styles.header}>
                        <Text style={styles.title}>Quick Apply</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color={theme.colors.text} />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.subtitle}>
                        Get started in 30 seconds. Complete full details later.
                    </Text>

                    <TouchableOpacity
                        style={styles.ocrButton}
                        onPress={handleOCR}
                        disabled={scanning}
                    >
                        <Ionicons name="scan-outline" size={20} color={theme.colors.primary} />
                        <Text style={styles.ocrButtonText}>
                            {scanning ? "Scanning..." : "Scan Business Card / Doc"}
                        </Text>
                    </TouchableOpacity>

                    {/* Loan Type Toggle */}
                    <Text style={styles.label}>Loan Type</Text>
                    <View style={styles.toggleRow}>
                        <TouchableOpacity
                            style={[styles.toggleButton, loanType === 'sba_7a' && styles.toggleActive]}
                            onPress={() => setLoanType('sba_7a')}
                        >
                            <Ionicons
                                name="cash-outline"
                                size={18}
                                color={loanType === 'sba_7a' ? '#fff' : theme.colors.primary}
                            />
                            <Text style={[styles.toggleText, loanType === 'sba_7a' && styles.toggleTextActive]}>
                                SBA 7(a)
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.toggleButton, loanType === 'sba_504' && styles.toggleActive]}
                            onPress={() => setLoanType('sba_504')}
                        >
                            <Ionicons
                                name="business-outline"
                                size={18}
                                color={loanType === 'sba_504' ? '#fff' : theme.colors.primary}
                            />
                            <Text style={[styles.toggleText, loanType === 'sba_504' && styles.toggleTextActive]}>
                                SBA 504
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Loan Amount */}
                    <Text style={styles.label}>Loan Amount</Text>
                    <View style={styles.inputWrapper}>
                        <Text style={styles.currencyPrefix}>$</Text>
                        <TextInput
                            style={styles.amountInput}
                            value={loanAmount}
                            onChangeText={(text) => setLoanAmount(formatCurrency(text))}
                            keyboardType="numeric"
                            placeholder="100,000"
                            placeholderTextColor={theme.colors.textSecondary}
                        />
                    </View>

                    {/* Full Name */}
                    <Text style={styles.label}>Full Name</Text>
                    <TextInput
                        style={styles.input}
                        value={fullName}
                        onChangeText={setFullName}
                        placeholder="John Doe"
                        placeholderTextColor={theme.colors.textSecondary}
                    />

                    {/* Business Name */}
                    <Text style={styles.label}>Business Name</Text>
                    <TextInput
                        style={styles.input}
                        value={businessName}
                        onChangeText={setBusinessName}
                        placeholder="Your business name"
                        placeholderTextColor={theme.colors.textSecondary}
                    />

                    {/* Phone */}
                    <Text style={styles.label}>Phone Number</Text>
                    <TextInput
                        style={styles.input}
                        value={phone}
                        onChangeText={setPhone}
                        keyboardType="phone-pad"
                        placeholder="(555) 123-4567"
                        placeholderTextColor={theme.colors.textSecondary}
                    />

                    {/* Submit Button */}
                    <TouchableOpacity
                        style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                        onPress={handleSubmit}
                        disabled={submitting}
                    >
                        <Text style={styles.submitButtonText}>
                            {submitting ? 'Submitting...' : 'Submit Quick Application'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={onClose} style={styles.fullAppLink}>
                        <Text style={styles.fullAppLinkText}>
                            Or complete full application →
                        </Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    sheet: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: theme.spacing.lg,
        paddingBottom: theme.spacing.xxl,
    },
    handle: {
        width: 40,
        height: 4,
        backgroundColor: theme.colors.border,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: theme.spacing.md,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.xs,
    },
    title: {
        ...theme.typography.h2,
    },
    closeButton: {
        padding: theme.spacing.xs,
    },
    subtitle: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.lg,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
        marginTop: theme.spacing.sm,
    },
    toggleRow: {
        flexDirection: 'row',
        gap: theme.spacing.sm,
    },
    toggleButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.primary,
        gap: 6,
    },
    toggleActive: {
        backgroundColor: theme.colors.primary,
    },
    toggleText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.primary,
    },
    toggleTextActive: {
        color: '#fff',
    },
    input: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        fontSize: 16,
        backgroundColor: theme.colors.background,
        color: theme.colors.text,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.background,
    },
    currencyPrefix: {
        paddingLeft: theme.spacing.md,
        fontSize: 16,
        color: theme.colors.textSecondary,
    },
    amountInput: {
        flex: 1,
        padding: theme.spacing.md,
        paddingLeft: theme.spacing.xs,
        fontSize: 16,
        color: theme.colors.text,
    },
    submitButton: {
        backgroundColor: theme.colors.success,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
        marginTop: theme.spacing.lg,
    },
    submitButtonDisabled: {
        opacity: 0.7,
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    fullAppLink: {
        alignItems: 'center',
        marginTop: theme.spacing.md,
    },
    fullAppLinkText: {
        color: theme.colors.primary,
        fontSize: 14,
    },
    ocrButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginBottom: theme.spacing.lg,
        gap: 8,
        backgroundColor: theme.colors.surfaceHighlight,
    },
    ocrButtonText: {
        color: theme.colors.primary,
        fontWeight: '600',
    },
});
