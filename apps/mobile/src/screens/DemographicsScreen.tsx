import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { auth } from '../../firebaseConfig';
import { getCurrentUserDoc, updateUserDoc } from '../services/firestore';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

const RACE_ETHNICITY_OPTIONS = [
    'Black or African American',
    'Hispanic or Latino',
    'Asian',
    'White',
    'American Indian or Alaska Native',
    'Native Hawaiian or Pacific Islander',
    'Two or more races',
    'Prefer not to say',
    'Other',
] as const;

const GENDER_OPTIONS = [
    'Female',
    'Male',
    'Non-binary',
    'Prefer not to say',
    'Other',
] as const;

const VETERAN_OPTIONS = [
    { key: 'yes', label: 'Yes' },
    { key: 'no', label: 'No' },
    { key: 'prefer_not', label: 'Prefer not to say' },
] as const;

export default function DemographicsScreen({ navigation }: any) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [raceEthnicity, setRaceEthnicity] = useState<string[]>([]);
    const [gender, setGender] = useState<string>('');
    const [veteranStatus, setVeteranStatus] = useState<'yes' | 'no' | 'prefer_not' | undefined>();

    const veteranLabel = useMemo(() => {
        const hit = VETERAN_OPTIONS.find((o) => o.key === veteranStatus);
        return hit?.label ?? 'Not set';
    }, [veteranStatus]);

    useEffect(() => {
        const load = async () => {
            try {
                const uid = auth.currentUser?.uid;
                if (!uid) {
                    setLoading(false);
                    return;
                }
                const user = await getCurrentUserDoc(uid);
                const demo = user?.demographics;
                setRaceEthnicity(Array.isArray(demo?.raceEthnicity) ? demo?.raceEthnicity : []);
                setGender(demo?.gender ?? '');
                setVeteranStatus(demo?.veteranStatus);
            } catch (err) {
                console.error('Demographics load failed', err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const toggleRaceEthnicity = (value: string) => {
        setRaceEthnicity((prev) => {
            const exists = prev.includes(value);
            if (exists) return prev.filter((v) => v !== value);
            return [...prev, value];
        });
    };

    const save = async () => {
        const uid = auth.currentUser?.uid;
        if (!uid) {
            Alert.alert('Sign in required', 'Please sign in to save this information.');
            return;
        }

        setSaving(true);
        try {
            await updateUserDoc(uid, {
                demographics: {
                    raceEthnicity,
                    gender: gender || undefined,
                    veteranStatus,
                },
            });
            Alert.alert('Saved', 'Thanks — your profile has been updated.', [
                { text: 'OK', onPress: () => navigation.goBack() },
            ]);
        } catch (err) {
            console.error('Demographics save failed', err);
            Alert.alert('Error', 'Could not save. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={20} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Demographics</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <Card style={styles.infoCard} variant="flat">
                    <Text style={styles.infoTitle}>Optional</Text>
                    <Text style={styles.infoText}>
                        Sharing this is optional. It helps AmPac understand impact and improve programs. You can choose “Prefer not to say”.
                    </Text>
                </Card>

                <Text style={styles.sectionLabel}>Race / Ethnicity</Text>
                <View style={styles.chipsWrap}>
                    {RACE_ETHNICITY_OPTIONS.map((opt) => {
                        const selected = raceEthnicity.includes(opt);
                        return (
                            <TouchableOpacity
                                key={opt}
                                style={[styles.chip, selected && styles.chipActive]}
                                onPress={() => toggleRaceEthnicity(opt)}
                            >
                                <Text style={[styles.chipText, selected && styles.chipTextActive]}>{opt}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <Text style={styles.sectionLabel}>Gender</Text>
                <View style={styles.chipsWrap}>
                    {GENDER_OPTIONS.map((opt) => {
                        const selected = gender === opt;
                        return (
                            <TouchableOpacity
                                key={opt}
                                style={[styles.chip, selected && styles.chipActive]}
                                onPress={() => setGender(opt)}
                            >
                                <Text style={[styles.chipText, selected && styles.chipTextActive]}>{opt}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <Text style={styles.sectionLabel}>Veteran</Text>
                <Card style={styles.rowCard} variant="flat">
                    {VETERAN_OPTIONS.map((opt) => {
                        const selected = veteranStatus === opt.key;
                        return (
                            <TouchableOpacity
                                key={opt.key}
                                style={[styles.row, selected && styles.rowActive]}
                                onPress={() => setVeteranStatus(opt.key)}
                            >
                                <Text style={styles.rowText}>{opt.label}</Text>
                                {selected ? (
                                    <Ionicons name="checkmark-circle" size={18} color={theme.colors.success} />
                                ) : (
                                    <Ionicons name="ellipse-outline" size={18} color={theme.colors.border} />
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </Card>

                <Card style={styles.summaryCard}>
                    <Text style={styles.summaryTitle}>Summary</Text>
                    <Text style={styles.summaryText}>
                        {raceEthnicity.length ? `Race/Ethnicity: ${raceEthnicity.join(', ')}` : 'Race/Ethnicity: Not provided'}
                    </Text>
                    <Text style={styles.summaryText}>
                        {gender ? `Gender: ${gender}` : 'Gender: Not provided'}
                    </Text>
                    <Text style={styles.summaryText}>Veteran: {veteranLabel}</Text>
                </Card>

                <Button
                    title={saving ? 'SAVING...' : 'SAVE'}
                    onPress={save}
                    disabled={saving}
                    style={{ marginTop: theme.spacing.lg }}
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
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        ...theme.typography.h3,
    },
    content: {
        padding: theme.spacing.lg,
        paddingBottom: theme.spacing.xxl,
    },
    infoCard: {
        marginBottom: theme.spacing.lg,
    },
    infoTitle: {
        ...theme.typography.label as any,
        marginBottom: 6,
    },
    infoText: {
        ...theme.typography.body,
        color: theme.colors.textSecondary,
    },
    sectionLabel: {
        ...theme.typography.label as any,
        marginTop: theme.spacing.lg,
        marginBottom: theme.spacing.sm,
    },
    chipsWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.sm,
    },
    chip: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: theme.borderRadius.round,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
    },
    chipActive: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    chipText: {
        fontSize: 12,
        fontWeight: '700',
        color: theme.colors.textSecondary,
    },
    chipTextActive: {
        color: '#fff',
    },
    rowCard: {
        padding: 0,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    rowActive: {
        backgroundColor: '#FAFAFA',
    },
    rowText: {
        ...theme.typography.body,
        fontWeight: '600',
    },
    summaryCard: {
        marginTop: theme.spacing.lg,
        padding: theme.spacing.lg,
    },
    summaryTitle: {
        ...theme.typography.h3,
        marginBottom: theme.spacing.sm,
    },
    summaryText: {
        ...theme.typography.body,
        color: theme.colors.textSecondary,
        marginBottom: 4,
    },
});
