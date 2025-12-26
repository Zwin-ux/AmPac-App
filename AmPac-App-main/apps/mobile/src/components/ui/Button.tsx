import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle, StyleProp } from 'react-native';
import { theme } from '../../theme';

interface ButtonProps {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'accent' | 'ghost';
    loading?: boolean;
    disabled?: boolean;
    style?: StyleProp<ViewStyle>;
    textStyle?: StyleProp<TextStyle>;
    icon?: React.ReactNode;
    accessibilityLabel?: string;
    accessibilityHint?: string;
    testID?: string;
}

export const Button: React.FC<ButtonProps> = ({
    title,
    onPress,
    variant = 'primary',
    loading = false,
    disabled = false,
    style,
    textStyle,
    icon,
    accessibilityLabel,
    accessibilityHint,
    testID,
}) => {
    const getBackgroundColor = () => {
        if (disabled) return theme.colors.border;
        switch (variant) {
            case 'primary': return theme.colors.primary;
            case 'secondary': return theme.colors.surface;
            case 'accent': return theme.colors.accent;
            case 'ghost': return 'transparent';
            default: return theme.colors.primary;
        }
    };

    const getTextColor = () => {
        if (disabled) return theme.colors.textSecondary;
        switch (variant) {
            case 'primary': return '#FFFFFF';
            case 'secondary': return theme.colors.text;
            case 'accent': return theme.colors.primary; // Dark text on bright accent
            case 'ghost': return theme.colors.primary;
            default: return '#FFFFFF';
        }
    };

    return (
        <TouchableOpacity
            style={[
                styles.button,
                { backgroundColor: getBackgroundColor() },
                variant === 'secondary' && styles.border,
                style
            ]}
            onPress={onPress}
            disabled={disabled || loading}
            activeOpacity={0.8}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel || title}
            accessibilityHint={accessibilityHint}
            accessibilityState={{ 
                disabled: disabled || loading,
                busy: loading,
            }}
            testID={testID}
        >
            {loading ? (
                <ActivityIndicator color={getTextColor()} />
            ) : (
                <>
                    {icon}
                    <Text style={[
                        styles.text,
                        { color: getTextColor() },
                        icon ? styles.textWithIcon : undefined,
                        textStyle
                    ]}>
                        {title}
                    </Text>
                </>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        height: 44, // Slightly shorter, denser
        borderRadius: theme.borderRadius.md, // Sharp corners (4px)
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.lg,
    },
    border: {
        borderWidth: 1,
        borderColor: theme.colors.primary, // High contrast border
    },
    text: {
        fontSize: 14,
        fontWeight: '600',
        letterSpacing: 0.2,
    },
    textWithIcon: {
        marginLeft: theme.spacing.sm,
    }
});
