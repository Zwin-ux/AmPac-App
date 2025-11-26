import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';
import { Room, Booking } from '../types';
import { createBooking } from '../services/rooms';
import { auth } from '../../firebaseConfig';
import { Timestamp } from 'firebase/firestore';

export default function RoomDetailScreen() {
    const route = useRoute<any>();
    const navigation = useNavigation();
    const { room } = route.params as { room: Room };
    const [loading, setLoading] = useState(false);

    // Mock booking logic for MVP
    const handleBookNow = async () => {
        // In a real app, we'd show a date picker here
        const mockStartTime = Timestamp.now();
        const mockEndTime = new Timestamp(mockStartTime.seconds + 3600, 0); // +1 hour

        setLoading(true);
        try {
            const userId = auth.currentUser ? auth.currentUser.uid : 'dev-user';

            const booking: Omit<Booking, 'id'> = {
                roomId: room.id,
                userId,
                startTime: mockStartTime,
                endTime: mockEndTime,
                status: 'confirmed',
                totalPrice: room.pricePerHour,
                createdAt: Timestamp.now(),
            };

            await createBooking(booking);

            Alert.alert(
                'Booking Confirmed',
                `You have booked ${room.name} for 1 hour.`,
                [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
        } catch (error) {
            Alert.alert('Error', 'Failed to book room. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.imagePlaceholder}>
                    <Text style={styles.placeholderText}>Room Photo</Text>
                </View>

                <View style={styles.content}>
                    <Text style={styles.title}>{room.name}</Text>
                    <Text style={styles.price}>${room.pricePerHour}/hr</Text>

                    <View style={styles.divider} />

                    <Text style={styles.sectionTitle}>Description</Text>
                    <Text style={styles.description}>{room.description || 'No description available.'}</Text>

                    <Text style={styles.sectionTitle}>Amenities</Text>
                    <View style={styles.amenitiesContainer}>
                        {room.amenities.map((amenity, index) => (
                            <View key={index} style={styles.amenityRow}>
                                <View style={styles.bullet} />
                                <Text style={styles.amenityText}>{amenity}</Text>
                            </View>
                        ))}
                    </View>

                    <Text style={styles.sectionTitle}>Capacity</Text>
                    <Text style={styles.description}>Up to {room.capacity} people</Text>
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.bookButton} onPress={handleBookNow} disabled={loading}>
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.bookButtonText}>Book for ${room.pricePerHour}</Text>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    scrollContent: {
        paddingBottom: 100,
    },
    imagePlaceholder: {
        height: 250,
        backgroundColor: '#e0e0e0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderText: {
        color: '#999',
        fontWeight: 'bold',
        fontSize: 18,
    },
    content: {
        padding: theme.spacing.lg,
    },
    title: {
        ...theme.typography.h1,
        marginBottom: theme.spacing.xs,
    },
    price: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.primary,
    },
    divider: {
        height: 1,
        backgroundColor: theme.colors.border,
        marginVertical: theme.spacing.lg,
    },
    sectionTitle: {
        ...theme.typography.h2,
        fontSize: 18,
        marginBottom: theme.spacing.sm,
        marginTop: theme.spacing.md,
    },
    description: {
        ...theme.typography.body,
        lineHeight: 24,
        color: theme.colors.textSecondary,
    },
    amenitiesContainer: {
        marginTop: theme.spacing.xs,
    },
    amenityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    bullet: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: theme.colors.primary,
        marginRight: 10,
    },
    amenityText: {
        fontSize: 16,
        color: theme.colors.text,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.lg,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
    bookButton: {
        backgroundColor: theme.colors.primary,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
    },
    bookButtonText: {
        ...theme.typography.button,
        fontSize: 18,
    },
});
