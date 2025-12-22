import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, SafeAreaView } from 'react-native';
import { theme } from '../theme';

interface LoadingScreenProps {
    message?: string;
    showLogo?: boolean;
}

export default function LoadingScreen({ 
    message = 'Loading...', 
    showLogo = true 
}: LoadingScreenProps) {
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                {showLogo && (
                    <View style={styles.logoContainer}>
                        <Text style={styles.logoText}>AMPAC</Text>
                        <Text style={styles.tagline}>Financial Services</Text>
                    </View>
                )}
                
                <ActivityIndicator 
                    size="large" 
                    color={theme.colors.primary} 
                    style={styles.spinner}
                />
                
                <Text style={styles.message}>{message}</Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing.xl,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: theme.spacing.xl * 2,
    },
    logoText: {
        fontSize: 48,
        fontWeight: '800',
        color: theme.colors.primary,
        letterSpacing: 4,
    },
    tagline: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.xs,
        letterSpacing: 2,
    },
    spinner: {
        marginBottom: theme.spacing.lg,
    },
    message: {
        fontSize: 16,
        color: theme.colors.textSecondary,
        textAlign: 'center',
    },
});
