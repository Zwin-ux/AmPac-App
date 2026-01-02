import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Linking } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';
import { Room, Booking } from '../types';
import { createBooking } from '../services/rooms';
import { auth } from '../../firebaseConfig';
import { getCurrentUserId } from '../services/authUtils';
import { Timestamp } from 'firebase/firestore';
import { pricingService } from '../services/pricing';
import { graphCalendarService } from '../services/microsoftGraph';
import { availabilityService } from '../services/availability';
import { stripeService } from '../services/stripeService';
import { Ionicons } from '@expo/vector-icons';
import { notifySupportChannel } from '../services/notifications';

export default function RoomDetailScreen() {
    const route = useRoute<any>();
    const navigation = useNavigation();
    const { room } = route.params as { room: Room };
    const [loading, setLoading] = useState(false);
    const [durationHours, setDurationHours] = useState(1);
    const [attendees, setAttendees] = useState(Math.min(4, room.capacity));

    const slotStart = useMemo(() => Timestamp.now(), []);
    const slotEnd = useMemo(
        () => Timestamp.fromMillis(slotStart.toMillis() + durationHours * 60 * 60 * 1000),
        [slotStart, durationHours]
    );

    const pricing = useMemo(
        () => pricingService.calculateRoomPrice({
            room,
            startTime: slotStart,
            endTime: slotEnd,
            attendees,
        }),
        [room, slotStart, slotEnd, attendees]
    );

    // Enhanced booking logic with Stripe payment integration
    const handleBookNow = async () => {
        setLoading(true);
        try {
            const userId = getCurrentUserId();
            if (!userId) throw new Error("User not authenticated");

            // Check availability first
            const availability = await availabilityService.checkItemsAvailability([{
                roomId: room.id,
                startTime: slotStart,
                endTime: slotEnd,
                attendees,
            }]);

            if (!availability.ok) {
                const reason = availability.conflicts.map(c => `${c.roomId}: ${c.reason}`).join(', ');
                Alert.alert('Unavailable', `This time is no longer available (${reason}). Please pick another slot.`);
                return;
            }

            // Create temporary hold
            const hold = await availabilityService.holdRooms([{
                roomId: room.id,
                startTime: slotStart,
                endTime: slotEnd,
                attendees,
            }]);

            // Create Stripe payment session for room booking
            const bookingId = `booking_${Date.now()}`;
            const paymentSession = await stripeService.createRoomBookingSession({
                bookingId,
                amount: Math.round(pricing.priceBreakdown.total * 100), // Convert to cents
                roomName: room.name,
                startTime: slotStart.toDate().toLocaleString(),
                endTime: slotEnd.toDate().toLocaleString(),
            });

            // Show payment confirmation dialog
            Alert.alert(
                'Confirm Payment',
                `Total: $${pricing.priceBreakdown.total.toFixed(2)}\n\nYou will be redirected to Stripe for secure payment.`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    { 
                        text: 'Pay Now', 
                        onPress: async () => {
                            try {
                                // Redirect to Stripe checkout
                                await Linking.openURL(paymentSession.url);
                                
                                // Create calendar event (optimistic)
                                const graphEventId = await graphCalendarService.createRoomEvent({
                                    roomId: room.id,
                                    startTime: slotStart,
                                    endTime: slotEnd,
                                    status: 'confirmed',
                                }, room);

                                // Create booking record (pending payment confirmation)
                                const booking: Omit<Booking, 'id'> = {
                                    userId,
                                    status: 'pending', // Will be updated to 'confirmed' after payment
                                    items: [{
                                        roomId: room.id,
                                        startTime: slotStart,
                                        endTime: slotEnd,
                                        attendees,
                                        status: 'pending',
                                        priceBreakdown: pricing.priceBreakdown,
                                        graphEventId,
                                    }],
                                    totalPrice: pricing.priceBreakdown.total,
                                    createdAt: Timestamp.now(),
                                    holdExpiresAt: hold.expiresAt,
                                    holdId: hold.holdId,
                                    paymentSessionId: paymentSession.sessionId,
                                };

                                await createBooking(booking);

                                // Fire-and-forget support notification
                                notifySupportChannel({
                                    title: 'New Room Booking (Payment Pending)',
                                    body: `Room: ${room.name} (${room.id})\nStart: ${slotStart.toDate().toISOString()}\nEnd: ${slotEnd.toDate().toISOString()}\nAttendees: ${attendees}\nTotal: $${pricing.priceBreakdown.total}\nPayment Session: ${paymentSession.sessionId}`,
                                });

                                Alert.alert(
                                    'Payment Initiated',
                                    'Your booking is being processed. You will receive a confirmation once payment is complete.',
                                    [{ text: 'OK', onPress: () => navigation.goBack() }]
                                );
                            } catch (paymentError) {
                                console.error('Payment error:', paymentError);
                                Alert.alert('Payment Error', 'Failed to process payment. Please try again.');
                            }
                        }
                    }
                ]
            );
        } catch (error) {
            console.error('Booking error:', error);
            Alert.alert('Error', 'Failed to initiate booking. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
                    <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>

                <View style={styles.imagePlaceholder}>
                    <Text style={styles.placeholderText}>Room Photo</Text>
                </View>

                <View style={styles.content}>
                    <Text style={styles.title}>{room.name}</Text>
                    <Text style={styles.price}>From ${room.pricePerHour}/hr</Text>

                    <View style={styles.divider} />

                    <Text style={styles.sectionTitle}>Booking duration</Text>
                    <View style={styles.chipRow}>
                        {[1, 2, 4, 8].map((hrs) => (
                            <TouchableOpacity
                                key={hrs}
                                style={[styles.chip, durationHours === hrs && styles.chipActive]}
                                onPress={() => setDurationHours(hrs)}
                            >
                                <Text style={[styles.chipText, durationHours === hrs && styles.chipTextActive]}>
                                    {hrs} hr{hrs > 1 ? 's' : ''}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={styles.sectionTitle}>Attendees</Text>
                    <View style={styles.chipRow}>
                        {[1, 2, 4, 6, 8, room.capacity].filter((v, idx, arr) => arr.indexOf(v) === idx && v <= room.capacity).map((count) => (
                            <TouchableOpacity
                                key={count}
                                style={[styles.chipSmall, attendees === count && styles.chipActive]}
                                onPress={() => setAttendees(count)}
                            >
                                <Text style={[styles.chipText, attendees === count && styles.chipTextActive]}>
                                    {count}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={styles.sectionTitle}>Description</Text>
                    <Text style={styles.description}>{room.description || 'No description available.'}</Text>

                    <Text style={styles.sectionTitle}>Amenities</Text>
                    <View style={styles.amenitiesContainer}>
                        {room.amenities.map((amenity: string, index: number) => (
                            <View key={index} style={styles.amenityRow}>
                                <View style={styles.bullet} />
                                <Text style={styles.amenityText}>{amenity}</Text>
                            </View>
                        ))}
                    </View>

                    <Text style={styles.sectionTitle}>Capacity</Text>
                    <Text style={styles.description}>Up to {room.capacity} people</Text>

                    <Text style={styles.sectionTitle}>Pricing breakdown</Text>
                    <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>Base</Text>
                        <Text style={styles.breakdownValue}>${pricing.priceBreakdown.base.toFixed(2)}</Text>
                    </View>
                    <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>Taxes</Text>
                        <Text style={styles.breakdownValue}>${pricing.priceBreakdown.taxes.toFixed(2)}</Text>
                    </View>
                    <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>Fees</Text>
                        <Text style={styles.breakdownValue}>${pricing.priceBreakdown.fees.toFixed(2)}</Text>
                    </View>
                    <View style={styles.breakdownRowTotal}>
                        <Text style={styles.breakdownLabelTotal}>Total</Text>
                        <Text style={styles.breakdownValueTotal}>${pricing.priceBreakdown.total.toFixed(2)}</Text>
                    </View>
                    {(pricing.priceBreakdown.appliedRules?.length ?? 0) > 0 && (
                        <Text style={styles.appliedRulesText}>
                            Tiered pricing applied: {pricing.priceBreakdown.appliedRules?.join(', ')}
                        </Text>
                    )}
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.bookButton} onPress={handleBookNow} disabled={loading}>
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.bookButtonText}>Book for ${pricing.priceBreakdown.total.toFixed(2)}</Text>
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
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.lg,
        paddingTop: theme.spacing.lg,
        gap: 8,
    },
    backButtonText: {
        color: theme.colors.text,
        fontSize: 16,
        fontWeight: '500',
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
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: theme.spacing.md,
        gap: 8,
    },
    chip: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
    },
    chipSmall: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
    },
    chipActive: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    chipText: {
        color: theme.colors.text,
        fontWeight: '600',
    },
    chipTextActive: {
        color: '#fff',
    },
    breakdownRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 6,
    },
    breakdownRowTotal: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        marginTop: theme.spacing.sm,
    },
    breakdownLabel: {
        color: theme.colors.textSecondary,
    },
    breakdownValue: {
        color: theme.colors.text,
        fontWeight: '600',
    },
    breakdownLabelTotal: {
        ...theme.typography.h3,
        fontSize: 16,
    },
    breakdownValueTotal: {
        ...theme.typography.h3,
        fontSize: 18,
        color: theme.colors.primary,
    },
    appliedRulesText: {
        marginTop: theme.spacing.xs,
        color: theme.colors.textSecondary,
        fontSize: 12,
    },
});
