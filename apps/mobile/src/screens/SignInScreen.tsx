import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebaseConfig';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../theme';

export default function SignInScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const navigation = useNavigation<any>();

    const handleSignIn = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please enter both email and password');
            return;
        }
        setLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error: any) {
            Alert.alert('Sign In Error', error.message);
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
                <Image
                    source={require('../../assets/ampac_logo.png')}
                    style={styles.logo}
                    resizeMode="contain"
                />
                <Text style={styles.subtitle}>Business Capital</Text>

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
                    onPress={async () => {
                        setLoading(true);
                        try {
                            // OFFLINE DEMO MODE
                            const { Timestamp } = await import('firebase/firestore');
                            const { userStore } = await import('../services/userStore');

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

                            // Bypass Firebase Auth completely
                            userStore.setDemoUser(demoProfile as any);

                        } catch (error: any) {
                            Alert.alert('Demo Error', error.message);
                        } finally {
                            setLoading(false);
                        }
                    }}
                    disabled={loading}
                >
                    <Text style={styles.demoButtonText}>⚡ Demo Mode (Bypass)</Text>
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
