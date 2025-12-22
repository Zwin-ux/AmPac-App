import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';

type AssistantBubbleProps = {
    context?: string;
};

/**
 * Safe stub for the assistant bubble.
 * If the assistant is unavailable or causing errors, this renders a simple
 * “Help” chip that opens the Support tab (parent screen handles navigation).
 */
export default function AssistantBubble({ }: AssistantBubbleProps) {
    const [isMinimized, setIsMinimized] = React.useState(false);

    return (
        <View style={styles.container} pointerEvents="box-none">
            <TouchableOpacity
                style={[styles.bubble, isMinimized && styles.bubbleMinimized]}
                activeOpacity={0.85}
                onPress={() => setIsMinimized(!isMinimized)}
            >
                <Ionicons
                    name={isMinimized ? "chatbubble-ellipses" : "chatbubbles-outline"}
                    size={isMinimized ? 22 : 18}
                    color={theme.colors.primary}
                />
                {!isMinimized && <Text style={styles.label}>Need help?</Text>}
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 90,
        right: 20,
        zIndex: 1000,
    },
    bubble: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderRadius: 24,
        paddingHorizontal: 12,
        paddingVertical: 10,
        ...theme.shadows.card,
        gap: 8,
    },
    bubbleMinimized: {
        paddingHorizontal: 10,
        paddingVertical: 10,
        borderRadius: 30,
        width: 44,
        height: 44,
        justifyContent: 'center',
        gap: 0,
    },
    label: {
        fontSize: 14,
        color: theme.colors.text,
        fontWeight: '600',
    },
});
