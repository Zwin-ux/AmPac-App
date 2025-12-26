import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
    message: string;
    type?: ToastType;
    onHide: () => void;
    duration?: number;
}

const { width } = Dimensions.get('window');

const Toast: React.FC<ToastProps> = ({ message, type = 'success', onHide, duration = 3000 }) => {
    const translateY = useRef(new Animated.Value(-100)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(translateY, {
                toValue: 20,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(opacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start();

        const timer = setTimeout(() => {
            hide();
        }, duration);

        return () => clearTimeout(timer);
    }, []);

    const hide = () => {
        Animated.parallel([
            Animated.timing(translateY, {
                toValue: -100,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(opacity, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start(() => {
            onHide();
        });
    };

    const getIcon = () => {
        switch (type) {
            case 'success': return 'checkmark-circle';
            case 'error': return 'alert-circle';
            case 'info': return 'information-circle';
            default: return 'checkmark-circle';
        }
    };

    const getIconColor = () => {
        switch (type) {
            case 'success': return theme.colors.success;
            case 'error': return theme.colors.error;
            case 'info': return theme.colors.info;
            default: return theme.colors.success;
        }
    };

    return (
        <Animated.View
            style={[
                styles.container,
                { transform: [{ translateY }], opacity }
            ]}
        >
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={hide}
                style={styles.content}
            >
                <Ionicons name={getIcon()} size={24} color={getIconColor()} />
                <Text style={styles.message} numberOfLines={2}>
                    {message}
                </Text>
            </TouchableOpacity>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 40,
        left: 20,
        right: 20,
        zIndex: 9999,
        alignItems: 'center',
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        width: '100%',
        maxWidth: 400,
        ...theme.shadows.float,
        borderLeftWidth: 4,
        borderLeftColor: theme.colors.primary,
    },
    message: {
        flex: 1,
        marginLeft: 12,
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
    },
});

export default Toast;
