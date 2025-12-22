import React from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { theme } from '../../theme';

interface FormInputProps extends TextInputProps {
    label: string;
    error?: string;
    hint?: string;
    testID?: string;
}

export const FormInput: React.FC<FormInputProps> = ({ 
    label, 
    error, 
    hint,
    style, 
    testID,
    ...props 
}) => {
    const inputId = `input-${label.replace(/\s+/g, '-').toLowerCase()}`;
    
    return (
        <View style={styles.container}>
            <Text 
                style={styles.label}
                accessibilityRole="text"
                nativeID={`${inputId}-label`}
            >
                {label}
            </Text>
            <TextInput
                style={[styles.input, error && styles.inputError, style]}
                placeholderTextColor={theme.colors.textSecondary}
                accessible={true}
                accessibilityLabel={label}
                accessibilityHint={hint || props.placeholder}
                accessibilityLabelledBy={`${inputId}-label`}
                accessibilityState={{
                    disabled: props.editable === false,
                }}
                testID={testID || inputId}
                {...props}
            />
            {hint && !error && (
                <Text style={styles.hintText} accessibilityRole="text">
                    {hint}
                </Text>
            )}
            {error && (
                <Text 
                    style={styles.errorText} 
                    accessibilityRole="alert"
                    accessibilityLiveRegion="assertive"
                >
                    {error}
                </Text>
            )}
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
    hintText: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        marginTop: 4,
    },
    errorText: {
        fontSize: 11,
        color: theme.colors.error,
        marginTop: 4,
    },
});
