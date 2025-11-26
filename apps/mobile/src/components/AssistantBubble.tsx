import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Animated } from 'react-native';
import { theme } from '../theme';

interface AssistantBubbleProps {
    context: string; // e.g., 'application', 'home', 'spaces'
}

export default function AssistantBubble({ context }: AssistantBubbleProps) {
    const [expanded, setExpanded] = useState(false);

    const getHelpText = () => {
        switch (context) {
            case 'application':
                return "Need help with the loan type? SBA 504 is great for real estate, while 7(a) is better for working capital. I can explain more if you like.";
            case 'spaces':
                return "Looking for a room? You can book by the hour. Members get a discount!";
            case 'network':
                return "Connect with other local businesses here. Try searching by industry.";
            default:
                return "Hi! I'm here to help you navigate AmPac resources.";
        }
    };

    if (expanded) {
        return (
            <View style={styles.expandedContainer}>
                <View style={styles.bubble}>
                    <Text style={styles.headerText}>AmPac Assistant</Text>
                    <Text style={styles.messageText}>{getHelpText()}</Text>
                    <TouchableOpacity style={styles.closeButton} onPress={() => setExpanded(false)}>
                        <Text style={styles.closeButtonText}>Got it</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <TouchableOpacity style={styles.collapsedContainer} onPress={() => setExpanded(true)}>
            <View style={styles.iconBubble}>
                <Text style={styles.iconText}>?</Text>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    collapsedContainer: {
        position: 'absolute',
        bottom: 90, // Moved up to avoid tab bar
        right: 20,
        zIndex: 1000,
    },
    iconBubble: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: theme.colors.secondary,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    iconText: {
        color: theme.colors.primary,
        fontSize: 24,
        fontWeight: 'bold',
    },
    expandedContainer: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        left: 20,
        zIndex: 1000,
    },
    bubble: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    headerText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: theme.colors.primary,
        marginBottom: 4,
    },
    messageText: {
        fontSize: 14,
        color: theme.colors.text,
        marginBottom: 10,
        lineHeight: 20,
    },
    closeButton: {
        alignSelf: 'flex-end',
    },
    closeButtonText: {
        color: theme.colors.primary,
        fontWeight: 'bold',
    },
});
