import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { signInWithEmailAndPassword, signInAnonymously } from 'firebase/auth';
import { useNavigation } from '@react-navigation/native';
import { auth } from '../../firebaseConfig';
import { theme } from '../theme';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { ErrorMessage, getErrorMessage } from '../copy/errors';
import { validateSignInCredentials, mapFirebaseAuthError } from '../services/authValidation';

export default function SignInScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<ErrorMessage | null>(null);
    const navigation = useNavigation<any>();

    const handleSignIn = async () => {
        const validation = validateSignInCredentials({ email, password });
        if (!validation.isValid) {
            setError(validation.error);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            await signInWithEmailAndPassword(auth, email.trim(), password);
        } catch (err: any) {
            console.error('Sign In Error:', err);
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
            const { userStore } = await import('../services/userStore');

            // 1. Sign in anonymously to get a valid Firebase session
            const { user } = await signInAnonymously(auth);

            const demoProfile = {
                uid: user.uid, // Use the real anonymous uid
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

            await userStore.setUser(demoProfile as any);
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
            <View style={styles.card}>
                <Text style={styles.subtitle}>Business Capital</Text>

                {error ? <ErrorBanner {...error} /> : null}

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Email</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter your email"
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
                        placeholder="Enter your password"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        placeholderTextColor={theme.colors.textSecondary}
                    />
                </View>

                <TouchableOpacity style={styles.button} onPress={handleSignIn} disabled={loading}>
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>Sign In</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.linkButton}
                    onPress={() => navigation.navigate('SignUp')}
                >
                    <Text style={styles.linkText}>Create account</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.demoButton}
                    onPress={handleDemo}
                    disabled={loading}
                >
                    <Text style={styles.demoButtonText}>Demo Mode (Bypass)</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: theme.spacing.lg,
        backgroundColor: theme.colors.background,
    },
    card: {
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.xl,
        borderRadius: theme.borderRadius.lg,
        ...theme.shadows.card,
    },
    logo: {
        width: '80%',
        height: 80,
        alignSelf: 'center',
        marginBottom: theme.spacing.sm,
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
        fontSize: 14,
        fontWeight: 'bold',
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
    button: {
        backgroundColor: theme.colors.primary,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
        marginTop: theme.spacing.md,
    },
    buttonText: {
        ...theme.typography.button,
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
