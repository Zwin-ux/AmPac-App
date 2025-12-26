import React from 'react';
import { View, Text, StyleSheet, Image, ViewStyle, TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { Button } from './Button';

interface EmptyStateProps {
    title: string;
    description: string;
    icon?: keyof typeof Ionicons.glyphMap;
    image?: any;
    actionLabel?: string;
    onAction?: () => void;
    style?: ViewStyle;
    titleStyle?: TextStyle;
    descriptionStyle?: TextStyle;
}

const EmptyState: React.FC<EmptyStateProps> = ({
    title,
    description,
    icon = 'document-text-outline',
    image,
    actionLabel,
    onAction,
    style,
    titleStyle,
    descriptionStyle,
}) => {
    return (
        <View style={[styles.container, style]}>
            {image ? (
                <Image source={image} style={styles.image} resizeMode="contain" />
            ) : (
                <View style={styles.iconContainer}>
                    <Ionicons name={icon} size={64} color={theme.colors.textSecondary + '40'} />
                </View>
            )}
            <Text style={[styles.title, titleStyle]}>{title}</Text>
            <Text style={[styles.description, descriptionStyle]}>{description}</Text>
            {actionLabel && onAction && (
                <Button
                    title={actionLabel}
                    onPress={onAction}
                    style={styles.button}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing.xl,
        marginTop: theme.spacing.xl * 2,
    },
    iconContainer: {
        marginBottom: theme.spacing.lg,
    },
    image: {
        width: 150,
        height: 150,
        marginBottom: theme.spacing.lg,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.text,
        textAlign: 'center',
        marginBottom: theme.spacing.sm,
    },
    description: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: theme.spacing.xl,
    },
    button: {
        minWidth: 160,
    },
});

export default EmptyState;
