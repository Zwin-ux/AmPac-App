import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle } from 'react-native';
import { theme } from '../theme';

interface SkeletonLoaderProps {
    width?: number | string;
    height?: number | string;
    style?: ViewStyle;
    borderRadius?: number;
    variant?: 'text' | 'circular' | 'rectangular' | 'card' | 'list-item' | 'message' | 'profile';
    lines?: number;
    animated?: boolean;
}

export default function SkeletonLoader({
    width = '100%',
    height = 20,
    style,
    borderRadius = theme.borderRadius.md,
    variant = 'rectangular',
    lines = 1,
    animated = true
}: SkeletonLoaderProps) {
    const opacity = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        if (!animated) return;

        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, {
                    toValue: 0.7,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0.3,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ])
        );
        animation.start();

        return () => animation.stop();
    }, [opacity, animated]);

    const renderVariant = () => {
        switch (variant) {
            case 'text':
                return (
                    <View>
                        {Array.from({ length: lines }).map((_, index) => (
                            <Animated.View
                                key={index}
                                style={[
                                    styles.skeleton,
                                    {
                                        width: index === lines - 1 ? '70%' : '100%',
                                        height: 16,
                                        borderRadius: 4,
                                        marginBottom: index < lines - 1 ? 8 : 0,
                                        opacity: animated ? opacity : 0.3,
                                    },
                                ]}
                            />
                        ))}
                    </View>
                );

            case 'circular':
                const size = typeof width === 'number' ? width : 40;
                return (
                    <Animated.View
                        style={[
                            styles.skeleton,
                            {
                                width: size,
                                height: size,
                                borderRadius: size / 2,
                                opacity: animated ? opacity : 0.3,
                            },
                            style,
                        ]}
                    />
                );

            case 'card':
                return (
                    <View style={[styles.card, style]}>
                        <Animated.View
                            style={[
                                styles.skeleton,
                                {
                                    width: '100%',
                                    height: 120,
                                    borderRadius: theme.borderRadius.md,
                                    marginBottom: 12,
                                    opacity: animated ? opacity : 0.3,
                                },
                            ]}
                        />
                        <Animated.View
                            style={[
                                styles.skeleton,
                                {
                                    width: '80%',
                                    height: 16,
                                    borderRadius: 4,
                                    marginBottom: 8,
                                    opacity: animated ? opacity : 0.3,
                                },
                            ]}
                        />
                        <Animated.View
                            style={[
                                styles.skeleton,
                                {
                                    width: '60%',
                                    height: 14,
                                    borderRadius: 4,
                                    opacity: animated ? opacity : 0.3,
                                },
                            ]}
                        />
                    </View>
                );

            case 'list-item':
                return (
                    <View style={[styles.listItem, style]}>
                        <Animated.View
                            style={[
                                styles.skeleton,
                                {
                                    width: 40,
                                    height: 40,
                                    borderRadius: 20,
                                    marginRight: 12,
                                    opacity: animated ? opacity : 0.3,
                                },
                            ]}
                        />
                        <View style={styles.listItemContent}>
                            <Animated.View
                                style={[
                                    styles.skeleton,
                                    {
                                        width: '70%',
                                        height: 16,
                                        borderRadius: 4,
                                        marginBottom: 6,
                                        opacity: animated ? opacity : 0.3,
                                    },
                                ]}
                            />
                            <Animated.View
                                style={[
                                    styles.skeleton,
                                    {
                                        width: '50%',
                                        height: 14,
                                        borderRadius: 4,
                                        opacity: animated ? opacity : 0.3,
                                    },
                                ]}
                            />
                        </View>
                    </View>
                );

            case 'message':
                return (
                    <View style={[styles.message, style]}>
                        <Animated.View
                            style={[
                                styles.skeleton,
                                {
                                    width: 32,
                                    height: 32,
                                    borderRadius: 16,
                                    marginRight: 8,
                                    opacity: animated ? opacity : 0.3,
                                },
                            ]}
                        />
                        <View style={styles.messageContent}>
                            <Animated.View
                                style={[
                                    styles.skeleton,
                                    {
                                        width: '90%',
                                        height: 14,
                                        borderRadius: 4,
                                        marginBottom: 4,
                                        opacity: animated ? opacity : 0.3,
                                    },
                                ]}
                            />
                            <Animated.View
                                style={[
                                    styles.skeleton,
                                    {
                                        width: '70%',
                                        height: 14,
                                        borderRadius: 4,
                                        opacity: animated ? opacity : 0.3,
                                    },
                                ]}
                            />
                        </View>
                    </View>
                );

            case 'profile':
                return (
                    <View style={[styles.profile, style]}>
                        <Animated.View
                            style={[
                                styles.skeleton,
                                {
                                    width: 80,
                                    height: 80,
                                    borderRadius: 40,
                                    alignSelf: 'center',
                                    marginBottom: 16,
                                    opacity: animated ? opacity : 0.3,
                                },
                            ]}
                        />
                        <Animated.View
                            style={[
                                styles.skeleton,
                                {
                                    width: '60%',
                                    height: 18,
                                    borderRadius: 4,
                                    alignSelf: 'center',
                                    marginBottom: 8,
                                    opacity: animated ? opacity : 0.3,
                                },
                            ]}
                        />
                        <Animated.View
                            style={[
                                styles.skeleton,
                                {
                                    width: '40%',
                                    height: 14,
                                    borderRadius: 4,
                                    alignSelf: 'center',
                                    opacity: animated ? opacity : 0.3,
                                },
                            ]}
                        />
                    </View>
                );

            default:
                return (
                    <Animated.View
                        style={[
                            styles.skeleton,
                            {
                                width: width as any,
                                height: height as any,
                                borderRadius,
                                opacity: animated ? opacity : 0.3,
                            },
                            style,
                        ]}
                    />
                );
        }
    };

    return renderVariant();
}

const styles = StyleSheet.create({
    skeleton: {
        backgroundColor: theme.colors.border,
    },
    card: {
        padding: 16,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    listItemContent: {
        flex: 1,
    },
    message: {
        flexDirection: 'row',
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    messageContent: {
        flex: 1,
    },
    profile: {
        padding: 20,
        alignItems: 'center',
    },
});
