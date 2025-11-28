import React from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { theme } from '../../theme';

interface FormInputProps extends TextInputProps {
    label: string;
    error?: string;
}

export const FormInput: React.FC<FormInputProps> = ({ label, error, style, ...props }) => {
    return (
        <View style={styles.container}>
            <Text style={styles.label}>{label}</Text>
            <TextInput
                style={[styles.input, error && styles.inputError, style]}
                placeholderTextColor={theme.colors.textSecondary}
                {...props}
            />
            {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: theme.spacing.md,
    },
    label: {
        fontSize: 11,
        fontWeight: '700',
        color: theme.colors.textSecondary,
        marginBottom: 6,
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    input: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.sm, // Sharp corners
        paddingHorizontal: theme.spacing.md,
        paddingVertical: 10, // Denser
        fontSize: 14,
        color: theme.colors.text,
        fontFamily: 'System', // Or specific font if we had one
    },
    inputError: {
        borderColor: theme.colors.error,
    },
    errorText: {
        fontSize: 11,
        color: theme.colors.error,
        marginTop: 4,
    },
});
