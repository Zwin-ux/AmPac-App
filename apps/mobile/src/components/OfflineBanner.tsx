import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { theme } from '../theme';

interface OfflineBannerProps {
    style?: object;
}

const HIDDEN_OFFSET = -52;
const ANIMATION_DURATION_MS = 300;

export default function OfflineBanner({ style }: OfflineBannerProps) {
    const [isOffline, setIsOffline] = useState(false);
    const slideAnim = useRef(new Animated.Value(HIDDEN_OFFSET)).current;
    const statusRef = useRef<boolean>(false);

    useEffect(() => {
        let mounted = true;

        const handleConnectivityChange = (isConnected: boolean | null) => {
            const offline = !isConnected;

            // Avoid unnecessary state churn or animations.
            if (statusRef.current === offline || !mounted) {
                return;
            }

            statusRef.current = offline;
            setIsOffline(offline);

            Animated.timing(slideAnim, {
                toValue: offline ? 0 : HIDDEN_OFFSET,
                duration: ANIMATION_DURATION_MS,
                useNativeDriver: true,
            }).start();
        };

        const unsubscribe = NetInfo.addEventListener(state => handleConnectivityChange(state.isConnected));

        // Prime the initial state so the banner is accurate immediately.
        NetInfo.fetch().then(state => {
            if (mounted) {
                handleConnectivityChange(state.isConnected);
            }
        });

        return () => {
            mounted = false;
            unsubscribe();
        };
    }, [slideAnim]);

    if (!isOffline) return null;

    return (
        <Animated.View
            accessibilityRole="alert"
            style={[
                styles.container,
                { transform: [{ translateY: slideAnim }] },
                style,
            ]}
        >
            <Ionicons name="cloud-offline" size={16} color="#fff" />
            <Text style={styles.text}>You are offline - changes will sync when you reconnect.</Text>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: theme.colors.warning,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        gap: 8,
    },
    text: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '500',
    },
});
