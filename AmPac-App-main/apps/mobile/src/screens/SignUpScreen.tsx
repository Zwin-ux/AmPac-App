import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { Timestamp } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { auth } from '../../firebaseConfig';
import { createUserDoc } from '../services/firestore';
import { userStore } from '../services/userStore';
import { theme } from '../theme';
import { User } from '../types';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { ErrorMessage, getErrorMessage } from '../copy/errors';
import { validateSignUpCredentials, mapFirebaseAuthError } from '../services/authValidation';

export default function SignUpScreen() {
    const navigation = useNavigation<any>();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [businessName, setBusinessName] = useState('');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<ErrorMessage | null>(null);

    const handleSignUp = async () => {
        const validation = validateSignUpCredentials({ email, password, fullName, businessName, phone });
        if (!validation.isValid) {
            setError(validation.error);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
            const user = userCredential.user;

            const newUser: User = {
                uid: user.uid,
                role: 'entrepreneur',
                fullName,
                businessName,
                phone,
                createdAt: Timestamp.now(),
                email: email.trim(),
            };

            await createUserDoc(newUser);
            await userStore.setUser(newUser);
        } catch (err: any) {
            console.error('SignUp Error:', err);
            setError(mapFirebaseAuthError(err?.code || 'unknown'));
        } finally {
            setLoading(false);
        }
    };

    const handleDemo = async () => {
        setLoading(true);
        setError(null);
        try {
            const { Timestamp } = await import('firebase/firestore');

            const demoProfile = {
                uid: 'demo-user-123',
                role: 'entrepreneur',
                fullName: 'Alex Rivera',
                businessName: 'Rivera Innovations',
                phone: '909-555-0101',
                industry: 'Technology',
                city: 'Riverside',
                bio: 'Building the future of sustainable tech in the Inland Empire.',
                jobTitle: 'Founder & CEO',
                createdAt: Timestamp.now(),
            };

            userStore.setDemoUser(demoProfile as any);
        } catch (err: any) {
            console.error('Demo Error:', err);
            setError({
                ...getErrorMessage('genericFallback'),
                detail: err?.message || getErrorMessage('genericFallback').detail,
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.card}>
                    <Text style={styles.title}>Create Account</Text>
                    <Text style={styles.subtitle}>Join AmPac today</Text>

                    {error ? <ErrorBanner {...error} /> : null}

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Full Name</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. Jane Doe"
                            value={fullName}
                            onChangeText={setFullName}
                            placeholderTextColor={theme.colors.textSecondary}
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Business Name</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. Acme Corp"
                            value={businessName}
                            onChangeText={setBusinessName}
                            placeholderTextColor={theme.colors.textSecondary}
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Phone</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. 555-0123"
                            value={phone}
                            onChangeText={setPhone}
                            keyboardType="phone-pad"
                            placeholderTextColor={theme.colors.textSecondary}
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Email</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="name@example.com"
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                            placeholderTextColor={theme.colors.textSecondary}
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Password</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Min. 6 characters"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            placeholderTextColor={theme.colors.textSecondary}
                        />
                    </View>

                    <TouchableOpacity style={styles.button} onPress={handleSignUp} disabled={loading}>
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>Sign Up</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.linkButton}
                        onPress={() => navigation.navigate('SignIn')}
                    >
                        <Text style={styles.linkText}>Already have an account? Sign In</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.demoButton}
                        onPress={handleDemo}
                        disabled={loading}
                    >
                        <Text style={styles.demoButtonText}>Demo Mode (Bypass)</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: theme.spacing.lg,
    },
    card: {
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.xl,
        borderRadius: theme.borderRadius.lg,
        ...theme.shadows.card,
    },
    logo: {
        width: '80%',
        height: 60,
        alignSelf: 'center',
        marginBottom: theme.spacing.md,
    },
    title: {
        ...theme.typography.h2,
        textAlign: 'center',
        marginBottom: theme.spacing.xs,
        color: theme.colors.primary,
    },
    subtitle: {
        ...theme.typography.body,
        textAlign: 'center',
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.xl,
    },
    inputContainer: {
        marginBottom: theme.spacing.md,
    },
    label: {
        ...theme.typography.label,
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
    button: {
        backgroundColor: theme.colors.primary,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
        marginTop: theme.spacing.md,
    },
    buttonText: {
        ...(theme.typography.button as any),
    },
    linkButton: {
        marginTop: theme.spacing.lg,
        alignItems: 'center',
    },
    linkText: {
        color: theme.colors.primary,
        fontSize: 16,
        fontWeight: '600',
    },
    demoButton: {
        marginTop: theme.spacing.xl,
        padding: theme.spacing.sm,
        alignItems: 'center',
        backgroundColor: theme.colors.surfaceHighlight,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    demoButtonText: {
        color: theme.colors.textSecondary,
        fontSize: 14,
        fontWeight: '600',
    },
});
