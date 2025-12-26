import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../theme';

interface DataFieldProps {
    label: string;
    value: string | number | null | undefined;
    subValue?: string;
    variant?: 'default' | 'highlight' | 'compact';
}

export const DataField: React.FC<DataFieldProps> = ({ label, value, subValue, variant = 'default' }) => {
    return (
        <View style={[styles.container, variant === 'compact' && styles.compact]}>
            <Text style={styles.label}>{label}</Text>
            <Text style={[
                styles.value,
                variant === 'highlight' && styles.highlightValue
            ]}>
                {value || '—'}
            </Text>
            {subValue && <Text style={styles.subValue}>{subValue}</Text>}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: theme.spacing.md,
    },
    compact: {
        marginBottom: theme.spacing.sm,
    },
    label: {
        ...theme.typography.label,
        marginBottom: 4,
    },
    value: {
        ...theme.typography.body,
        fontWeight: '500',
        color: theme.colors.text,
    },
    highlightValue: {
        color: theme.colors.primary,
        fontWeight: '700',
    },
    subValue: {
        ...theme.typography.caption,
        marginTop: 2,
    }
});
