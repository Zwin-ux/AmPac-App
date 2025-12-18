import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { auth } from '../../firebaseConfig';
import { getCurrentUserDoc, updateUserDoc } from '../services/firestore';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

const SUGGESTED_SKILLS = [
    'Accounting',
    'Marketing',
    'Sales',
    'Operations',
    'Legal',
    'HR',
    'Technology',
    'Design',
    'Construction',
    'Real Estate',
    'Manufacturing',
    'Funding / Capital',
    'Business Planning',
    'Branding',
    'Social Media',
    'Bookkeeping',
    'Insurance',
    'Logistics',
    'Customer Support',
    'Leadership',
] as const;

const normalizeSkill = (value: string) =>
    value
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/^\w/, (c) => c.toUpperCase());

export default function SkillsScreen({ navigation }: any) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [skills, setSkills] = useState<string[]>([]);
    const [customSkill, setCustomSkill] = useState('');
    const [query, setQuery] = useState('');

    useEffect(() => {
        const load = async () => {
            try {
                const uid = auth.currentUser?.uid;
                if (!uid) {
                    setLoading(false);
                    return;
                }
                const user = await getCurrentUserDoc(uid);
                setSkills(Array.isArray(user?.skills) ? user!.skills! : []);
            } catch (err) {
                console.error('Skills load failed', err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const filteredSuggestions = useMemo(() => {
        const q = query.trim().toLowerCase();
        const base = Array.from(new Set([...SUGGESTED_SKILLS, ...skills]));
        if (!q) return base;
        return base.filter((s) => s.toLowerCase().includes(q));
    }, [query, skills]);

    const toggleSkill = (value: string) => {
        setSkills((prev) => {
            const normalized = normalizeSkill(value);
            const exists = prev.some((s) => s.toLowerCase() === normalized.toLowerCase());
            if (exists) return prev.filter((s) => s.toLowerCase() !== normalized.toLowerCase());
            return [...prev, normalized].sort((a, b) => a.localeCompare(b));
        });
    };

    const addCustom = () => {
        const normalized = normalizeSkill(customSkill);
        if (!normalized) return;
        setCustomSkill('');
        toggleSkill(normalized);
    };

    const save = async () => {
        const uid = auth.currentUser?.uid;
        if (!uid) {
            Alert.alert('Sign in required', 'Please sign in to save this information.');
            return;
        }

        setSaving(true);
        try {
            await updateUserDoc(uid, { skills });
            Alert.alert('Saved', 'Your skills have been updated.', [
                { text: 'OK', onPress: () => navigation.goBack() },
            ]);
        } catch (err) {
            console.error('Skills save failed', err);
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
                <Text style={styles.headerTitle}>Skills & Services</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <Card style={styles.infoCard} variant="flat">
                    <Text style={styles.infoTitle}>Why this matters</Text>
                    <Text style={styles.infoText}>
                        Add skills you have (or services you offer). This helps AmPac connect entrepreneurs and route support faster.
                    </Text>
                </Card>

                <View style={styles.searchRow}>
                    <Ionicons name="search-outline" size={18} color={theme.colors.textSecondary} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search skills"
                        placeholderTextColor={theme.colors.textSecondary}
                        value={query}
                        onChangeText={setQuery}
                        autoCapitalize="none"
                    />
                    {query ? (
                        <TouchableOpacity onPress={() => setQuery('')} style={styles.clearBtn}>
                            <Ionicons name="close-circle" size={18} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                    ) : null}
                </View>

                <Text style={styles.sectionLabel}>Selected</Text>
                <View style={styles.chipsWrap}>
                    {skills.length ? (
                        skills.map((s) => (
                            <TouchableOpacity
                                key={s}
                                style={[styles.chip, styles.chipActive]}
                                onPress={() => toggleSkill(s)}
                            >
                                <Text style={[styles.chipText, styles.chipTextActive]}>{s}</Text>
                                <Ionicons name="close" size={14} color="#fff" style={{ marginLeft: 6 }} />
                            </TouchableOpacity>
                        ))
                    ) : (
                        <Text style={styles.emptyText}>No skills added yet.</Text>
                    )}
                </View>

                <Text style={styles.sectionLabel}>Suggested</Text>
                <View style={styles.chipsWrap}>
                    {filteredSuggestions.map((s) => {
                        const selected = skills.some((x) => x.toLowerCase() === s.toLowerCase());
                        return (
                            <TouchableOpacity
                                key={s}
                                style={[styles.chip, selected && styles.chipActive]}
                                onPress={() => toggleSkill(s)}
                            >
                                <Text style={[styles.chipText, selected && styles.chipTextActive]}>{s}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <Text style={styles.sectionLabel}>Add your own</Text>
                <Card style={styles.addCard} variant="flat">
                    <View style={styles.addRow}>
                        <TextInput
                            style={styles.addInput}
                            placeholder="e.g. Restaurant Operations"
                            placeholderTextColor={theme.colors.textSecondary}
                            value={customSkill}
                            onChangeText={setCustomSkill}
                        />
                        <Button
                            title="ADD"
                            onPress={addCustom}
                            variant="primary"
                            disabled={!customSkill.trim()}
                            style={{ height: 44 }}
                        />
                    </View>
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
        marginBottom: theme.spacing.md,
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
        flexDirection: 'row',
        alignItems: 'center',
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
    emptyText: {
        ...theme.typography.caption,
        marginTop: 2,
    },
    addCard: {
        padding: theme.spacing.md,
    },
    addRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
    },
    addInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: 12,
        fontSize: 15,
        color: theme.colors.text,
        backgroundColor: theme.colors.surface,
    },
});

