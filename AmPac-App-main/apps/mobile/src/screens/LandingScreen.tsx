import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';

const { width, height } = Dimensions.get('window');

export default function LandingScreen({ navigation }: any) {
    // Animation Values
    const logoOpacity = useRef(new Animated.Value(0)).current;
    const logoScale = useRef(new Animated.Value(0.8)).current;
    const textTranslateY = useRef(new Animated.Value(20)).current;
    const textOpacity = useRef(new Animated.Value(0)).current;
    const taglineOpacity = useRef(new Animated.Value(0)).current;
    const buttonsTranslateY = useRef(new Animated.Value(50)).current;
    const buttonsOpacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Start animations
        Animated.sequence([
            Animated.parallel([
                Animated.timing(logoOpacity, {
                    toValue: 1,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(logoScale, {
                    toValue: 1,
                    duration: 800,
                    easing: Easing.out(Easing.back(1.2)),
                    useNativeDriver: true,
                }),
            ]),
            Animated.parallel([
                Animated.timing(textOpacity, {
                    toValue: 1,
                    duration: 600,
                    useNativeDriver: true,
                }),
                Animated.timing(textTranslateY, {
                    toValue: 0,
                    duration: 600,
                    useNativeDriver: true,
                }),
            ]),
            Animated.timing(taglineOpacity, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }),
            Animated.parallel([
                Animated.timing(buttonsOpacity, {
                    toValue: 1,
                    duration: 600,
                    useNativeDriver: true,
                }),
                Animated.timing(buttonsTranslateY, {
                    toValue: 0,
                    duration: 600,
                    useNativeDriver: true,
                }),
            ]),
        ]).start();
    }, []);

    return (
        <SafeAreaView style={styles.container}>
            {/* Background Elements for "2025" feel */}
            <View style={styles.backgroundCircle1} />
            <View style={styles.backgroundCircle2} />

            <View style={styles.content}>
                <View style={styles.logoContainer}>
                    <Animated.View style={{ opacity: textOpacity, transform: [{ translateY: textTranslateY }] }}>
                        <Text style={styles.title}>AmPac Business Capital</Text>
                    </Animated.View>

                    <Animated.View style={{ opacity: taglineOpacity }}>
                        <Text style={styles.tagline}>It is possible.</Text>
                    </Animated.View>
                </View>

                <Animated.View 
                    style={[
                        styles.buttonsContainer, 
                        { opacity: buttonsOpacity, transform: [{ translateY: buttonsTranslateY }] }
                    ]}
                >
                    <TouchableOpacity
                        style={[styles.button, styles.primaryButton]}
                        onPress={() => navigation.navigate('SignIn')}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.primaryButtonText}>Sign In</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.button, styles.secondaryButton]}
                        onPress={() => navigation.navigate('SignUp')}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.secondaryButtonText}>Create Account</Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff', // Clean white background
        overflow: 'hidden',
    },
    // Subtle background shapes for depth
    backgroundCircle1: {
        position: 'absolute',
        top: -100,
        right: -100,
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundColor: theme.colors.primary,
        opacity: 0.05,
    },
    backgroundCircle2: {
        position: 'absolute',
        bottom: -50,
        left: -50,
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: theme.colors.secondary || '#0047AB', // Fallback to a blue if secondary not defined
        opacity: 0.05,
    },
    content: {
        flex: 1,
        justifyContent: 'space-between',
        padding: theme.spacing.xl,
    },
    logoContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: -50, // Visual centering adjustment
    },
    logo: {
        width: width * 0.7, // Responsive width
        height: 120,
        marginBottom: theme.spacing.xl,
    },
    title: {
        fontSize: 26,
        fontWeight: '700',
        color: theme.colors.text,
        textAlign: 'center',
        marginBottom: theme.spacing.sm,
        letterSpacing: 0.5,
    },
    tagline: {
        fontSize: 22,
        fontWeight: '300', // Light weight for elegance
        color: theme.colors.primary,
        textAlign: 'center',
        marginTop: theme.spacing.md,
        letterSpacing: 1.5, // Wide tracking for "2025" feel
        fontStyle: 'italic',
    },
    buttonsContainer: {
        gap: theme.spacing.md,
        marginBottom: theme.spacing.xl,
        width: '100%',
    },
    button: {
        paddingVertical: 18,
        borderRadius: 12, // Slightly more rounded
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    primaryButton: {
        backgroundColor: theme.colors.primary,
    },
    secondaryButton: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: theme.colors.border,
        shadowOpacity: 0.05,
    },
    primaryButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    secondaryButtonText: {
        color: theme.colors.text,
        fontSize: 18,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
});
