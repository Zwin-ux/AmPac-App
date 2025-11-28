import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';
import { User } from '../types';
import { auth } from '../../firebaseConfig';
import { getCurrentUserDoc, updateUserDoc } from '../services/firestore';
import { cacheService } from '../services/cache';

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
});
