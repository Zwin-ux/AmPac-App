import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';
import { User } from '../types';
import { auth } from '../../firebaseConfig';
import { getCurrentUserDoc, updateUserDoc } from '../services/firestore';
import { cacheService } from '../services/cache';
import { Ionicons } from '@expo/vector-icons';

const CACHE_KEY_PROFILE = 'cache_user_profile';

export default function EditProfileScreen({ navigation }: any) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState<Partial<User>>({});

    useEffect(() => {
        loadUserData();
    }, []);

    const loadUserData = async () => {
        try {
            if (auth.currentUser) {
                const userData = await getCurrentUserDoc(auth.currentUser.uid);
                if (userData) {
                    setFormData(userData);
                }
            } else {
                // Fallback for dev/mock
                const cached = await cacheService.get<User>(CACHE_KEY_PROFILE);
                if (cached) setFormData(cached);
            }
        } catch (error) {
            console.error("Error loading user data:", error);
            Alert.alert("Error", "Failed to load profile data");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!auth.currentUser) {
            Alert.alert("Error", "You must be logged in to save changes.");
            return;
        }

        setSaving(true);
        try {
            await updateUserDoc(auth.currentUser.uid, formData);

            // Update cache
            const updatedUser = { ...formData, uid: auth.currentUser.uid } as User;
            await cacheService.set(CACHE_KEY_PROFILE, updatedUser);

            Alert.alert("Success", "Profile updated successfully", [
                { text: "OK", onPress: () => navigation.goBack() }
            ]);
        } catch (error) {
            console.error("Error saving profile:", error);
            Alert.alert("Error", "Failed to save changes. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    const updateField = (key: keyof User, value: string) => {
        setFormData(prev => ({ ...prev, [key]: value }));
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
                    <Text style={styles.backButtonText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Edit Profile</Text>
                <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.saveButton}>
                    <Text style={[styles.saveButtonText, saving && styles.disabledText]}>
                        {saving ? "Saving..." : "Save"}
                    </Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Full Name</Text>
                    <TextInput
                        style={styles.input}
                        value={formData.fullName}
                        onChangeText={(text) => updateField('fullName', text)}
                        placeholder="Enter your full name"
                    />
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Job Title</Text>
                    <TextInput
                        style={styles.input}
                        value={formData.jobTitle}
                        onChangeText={(text) => updateField('jobTitle', text)}
                        placeholder="e.g. CEO, Founder"
                    />
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Business Name</Text>
                    <TextInput
                        style={styles.input}
                        value={formData.businessName}
                        onChangeText={(text) => updateField('businessName', text)}
                        placeholder="Enter your business name"
                    />
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Industry</Text>
                    <TextInput
                        style={styles.input}
                        value={formData.industry}
                        onChangeText={(text) => updateField('industry', text)}
                        placeholder="e.g. Technology, Retail"
                    />
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Bio</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        value={formData.bio}
                        onChangeText={(text) => updateField('bio', text)}
                        placeholder="Tell us about yourself and your business..."
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                    />
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Website</Text>
                    <TextInput
                        style={styles.input}
                        value={formData.website}
                        onChangeText={(text) => updateField('website', text)}
                        placeholder="https://example.com"
                        autoCapitalize="none"
                        keyboardType="url"
                    />
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>LinkedIn URL</Text>
                    <TextInput
                        style={styles.input}
                        value={formData.linkedinUrl}
                        onChangeText={(text) => updateField('linkedinUrl', text)}
                        placeholder="https://linkedin.com/in/username"
                        autoCapitalize="none"
                        keyboardType="url"
                    />
                </View>

                {/* --- Business Card Customization --- */}
                <View style={[styles.section, { marginTop: 16 }]}>
                    <Text style={styles.sectionTitle}>Business Card Style</Text>
                    
                    {/* Card Color */}
                    <Text style={styles.label}>Card Color</Text>
                    <View style={styles.colorRow}>
                        {['#1E88E5', '#43A047', '#E53935', '#FB8C00', '#8E24AA', '#546E7A', '#212121'].map(color => (
                            <TouchableOpacity
                                key={color}
                                style={[
                                    styles.colorSwatch, 
                                    { backgroundColor: color },
                                    formData.cardColor === color && styles.colorSwatchActive
                                ]}
                                onPress={() => updateField('cardColor', color)}
                            />
                        ))}
                    </View>

                    {/* Business Status */}
                    <Text style={styles.label}>Business Stage</Text>
                    <View style={styles.chipRow}>
                        {['idea', 'startup', 'scaling', 'established'].map(status => (
                            <TouchableOpacity
                                key={status}
                                style={[
                                    styles.chip,
                                    formData.businessStatus === status && styles.chipActive
                                ]}
                                onPress={() => updateField('businessStatus', status)}
                            >
                                <Text style={[
                                    styles.chipText,
                                    formData.businessStatus === status && styles.chipTextActive
                                ]}>{status.charAt(0).toUpperCase() + status.slice(1)}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>More About You</Text>
                    <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate('Demographics')}>
                        <Text style={styles.linkRowText}>Demographics (optional)</Text>
                        <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate('Skills')}>
                        <Text style={styles.linkRowText}>Skills & Services</Text>
                        <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                </View>
            </ScrollView>
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
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
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
        fontSize: 16,
        color: theme.colors.textSecondary,
    },
    saveButton: {
        padding: theme.spacing.sm,
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.primary,
    },
    disabledText: {
        opacity: 0.5,
    },
    content: {
        padding: theme.spacing.lg,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    formGroup: {
        marginBottom: theme.spacing.lg,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.xs,
    },
    input: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        fontSize: 16,
        color: theme.colors.text,
    },
    textArea: {
        minHeight: 100,
    },
    section: {
        marginBottom: 24,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 16,
        color: theme.colors.text,
    },
    colorRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 16,
    },
    colorSwatch: {
        width: 36,
        height: 36,
        borderRadius: 18,
        marginRight: 12,
        marginBottom: 12,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    colorSwatchActive: {
        borderColor: theme.colors.text,
        transform: [{ scale: 1.1 }],
    },
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#f0f0f0',
        marginRight: 8,
        marginBottom: 8,
    },
    chipActive: {
        backgroundColor: theme.colors.primary,
    },
    chipText: {
        color: '#666',
        fontSize: 14,
    },
    chipTextActive: {
        color: '#fff',
        fontWeight: 'bold',
    },
    linkRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.surface,
        marginBottom: 10,
    },
    linkRowText: {
        fontSize: 14,
        fontWeight: '700',
        color: theme.colors.text,
    },
});
