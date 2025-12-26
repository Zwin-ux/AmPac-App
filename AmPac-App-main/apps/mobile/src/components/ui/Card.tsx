import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { theme } from '../../theme';

interface CardProps {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    variant?: 'default' | 'flat';
}

export const Card: React.FC<CardProps> = ({ children, style, variant = 'default' }) => {
    return (
        <View style={[
            styles.card,
            variant === 'flat' && styles.flat,
            style
        ]}>
            {children}
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md, // Sharper corners
        padding: theme.spacing.md,
        ...theme.shadows.card, // Now uses border instead of shadow
    },
    flat: {
        backgroundColor: theme.colors.surfaceHighlight, // Subtle contrast
        borderWidth: 0, // Flat cards might just be a fill
        borderColor: 'transparent',
    }
});
