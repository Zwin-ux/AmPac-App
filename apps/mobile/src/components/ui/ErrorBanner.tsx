import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../../theme';
import { ErrorMessage } from '../../copy/errors';

type Props = ErrorMessage & {
    onPress?: () => void;
};

export const ErrorBanner: React.FC<Props> = ({ title, detail, action, onPress }) => {
    return (
        <View style={styles.container}>
            <View style={styles.textWrap}>
                <Text style={styles.title}>{title}</Text>
                {detail ? <Text style={styles.detail}>{detail}</Text> : null}
            </View>
            {action && onPress ? (
                <TouchableOpacity style={styles.actionButton} onPress={onPress}>
                    <Text style={styles.actionText}>{action}</Text>
                </TouchableOpacity>
            ) : null}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF2F2',
        borderColor: theme.colors.error,
        borderWidth: 1,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.lg,
        marginHorizontal: theme.spacing.md,
        marginBottom: theme.spacing.sm,
    },
    textWrap: {
        flex: 1,
        marginRight: theme.spacing.sm,
    },
    title: {
        fontSize: 14,
        fontWeight: '700',
        color: theme.colors.error,
    },
    detail: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        marginTop: 2,
        lineHeight: 18,
    },
    actionButton: {
        backgroundColor: theme.colors.primary,
        borderRadius: theme.borderRadius.round,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    actionText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
    },
});

export default ErrorBanner;
