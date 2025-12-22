import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Timestamp } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';

import { Room, Booking } from '../types';
import { pricingService } from '../services/pricing';
import { createBooking } from '../services/rooms';
import { graphCalendarService } from '../services/microsoftGraph';
import { auth } from '../../firebaseConfig';
import { getCurrentUserId } from '../services/authUtils';
import { theme } from '../theme';
import { availabilityService } from '../services/availability';

type RouteParams = { rooms: Room[] };

export default function MultiRoomBookingScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const rooms = (route.params as RouteParams)?.rooms ?? [];
    const [durationHours, setDurationHours] = useState(2);
    const [loading, setLoading] = useState(false);

    const slotStart = useMemo(() => Timestamp.now(), []);
    const slotEnd = useMemo(
        () => Timestamp.fromMillis(slotStart.toMillis() + durationHours * 60 * 60 * 1000),
        [slotStart, durationHours]
    );

    const quote = useMemo(() => {
        if (!rooms.length) {
            return { items: [], total: 0, currency: 'USD' };
        }
        return pricingService.quote({
            rooms: rooms.map(r => ({ roomId: r.id, startTime: slotStart, endTime: slotEnd })),
        }, rooms);
    }, [rooms, slotStart, slotEnd]);

    const handleCheckout = async () => {
        if (!rooms.length) {
            Alert.alert('No rooms selected', 'Please add at least one room.');
            return;
        }

        setLoading(true);
        try {
            const userId = getCurrentUserId();
            if (!userId) throw new Error("User not authenticated");

            const itemsToCheck = rooms.map(room => ({
                roomId: room.id,
                startTime: slotStart,
                endTime: slotEnd,
            }));

            const availability = await availabilityService.checkItemsAvailability(itemsToCheck);
            if (!availability.ok) {
                const reason = availability.conflicts.map(c => `${c.roomId}: ${c.reason}`).join(', ');
                Alert.alert('Unavailable', `One or more rooms are not available (${reason}). Please adjust time or rooms.`);
                return;
            }

            const hold = await availabilityService.holdRooms(itemsToCheck);

            const bookingItems = await Promise.all(rooms.map(async (room) => {
                const roomQuote = quote.items.find(i => i.roomId === room.id);
                const graphEventId = await graphCalendarService.createRoomEvent({
                    roomId: room.id,
                    startTime: slotStart,
                    endTime: slotEnd,
                    status: 'confirmed',
                    priceBreakdown: roomQuote?.priceBreakdown,
                }, room);

                return {
                    roomId: room.id,
                    startTime: slotStart,
                    endTime: slotEnd,
                    status: 'confirmed' as const,
                    priceBreakdown: roomQuote?.priceBreakdown,
                    graphEventId,
                };
            }));

            const booking: Omit<Booking, 'id'> = {
                userId,
                status: 'confirmed',
                items: bookingItems,
                totalPrice: quote.total,
                holdExpiresAt: hold.expiresAt,
                holdId: hold.holdId,
                createdAt: Timestamp.now(),
            };

            await createBooking(booking);
            Alert.alert('Booking Created', 'Your rooms are booked with one checkout.', [
                { text: 'Done', onPress: () => navigation.navigate('SpacesList') }
            ]);
        } catch (error) {
            console.error('Multi-room booking error', error);
            Alert.alert('Error', 'Failed to create booking. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
                    </TouchableOpacity>
                    <View>
                        <Text style={styles.title}>Multi-room booking</Text>
                        <Text style={styles.subtitle}>{rooms.length} room(s) selected</Text>
                    </View>
                </View>

                <Text style={styles.sectionTitle}>Duration</Text>
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

                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle}>Selected rooms</Text>
                        <View style={styles.graphPill}>
                            <Ionicons name="cloud-done-outline" size={14} color="#fff" />
                            <Text style={styles.graphPillText}>Graph-ready</Text>
                        </View>
                    </View>
                    {rooms.map((room) => {
                        const roomQuote = quote.items.find(i => i.roomId === room.id);
                        const roomPrice = roomQuote?.priceBreakdown?.total;
                        return (
                            <View key={room.id} style={styles.roomRow}>
                                <View style={styles.roomMeta}>
                                    <Text style={styles.roomName}>{room.name}</Text>
                                    <Text style={styles.roomSubtitle}>{room.location || 'AmPac site'}</Text>
                                    <Text style={styles.roomSubtitleSmall}>Capacity {room.capacity}</Text>
                                </View>
                                <View style={styles.roomPrice}>
                                    <Text style={styles.roomPriceValue}>{roomPrice !== undefined ? `$${roomPrice.toFixed(2)}` : '—'}</Text>
                                    <Text style={styles.roomPriceLabel}>incl. tiers/taxes</Text>
                                </View>
                            </View>
                        );
                    })}
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Pricing summary</Text>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Rooms</Text>
                        <Text style={styles.summaryValue}>${quote.total.toFixed(2)}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Slots</Text>
                        <Text style={styles.summaryValue}>{slotStart.toDate().toLocaleString()} → {slotEnd.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                    </View>
                    <View style={styles.summaryRowTotal}>
                        <Text style={styles.summaryTotalLabel}>Total</Text>
                        <Text style={styles.summaryTotalValue}>${quote.total.toFixed(2)}</Text>
                    </View>
                    <Text style={styles.summaryHint}>One payment, per-room receipts. Outlook/Teams events are generated via Microsoft Graph.</Text>
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.payButton} onPress={handleCheckout} disabled={loading}>
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.payButtonText}>Confirm &amp; pay ${quote.total.toFixed(2)}</Text>}
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
        padding: theme.spacing.lg,
        paddingBottom: theme.spacing.xl * 2,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: theme.spacing.lg,
    },
    title: {
        ...theme.typography.h1,
        fontSize: 22,
    },
    subtitle: {
        color: theme.colors.textSecondary,
    },
    sectionTitle: {
        ...theme.typography.h2,
        marginBottom: theme.spacing.sm,
    },
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: theme.spacing.lg,
    },
    chip: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 24,
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
    card: {
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.lg,
        borderRadius: theme.borderRadius.lg,
        marginBottom: theme.spacing.lg,
        ...theme.shadows.card,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.md,
    },
    cardTitle: {
        ...theme.typography.h3,
        fontSize: 16,
    },
    graphPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 16,
    },
    graphPillText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 12,
    },
    roomRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    roomMeta: {
        flex: 1,
    },
    roomName: {
        ...theme.typography.h3,
        fontSize: 16,
    },
    roomSubtitle: {
        color: theme.colors.textSecondary,
    },
    roomSubtitleSmall: {
        color: theme.colors.textSecondary,
        fontSize: 12,
    },
    roomPrice: {
        alignItems: 'flex-end',
    },
    roomPriceValue: {
        ...theme.typography.h3,
        color: theme.colors.primary,
    },
    roomPriceLabel: {
        color: theme.colors.textSecondary,
        fontSize: 12,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 6,
    },
    summaryRowTotal: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        marginTop: theme.spacing.sm,
    },
    summaryLabel: {
        color: theme.colors.textSecondary,
    },
    summaryValue: {
        color: theme.colors.text,
        fontWeight: '600',
    },
    summaryTotalLabel: {
        ...theme.typography.h3,
        fontSize: 16,
    },
    summaryTotalValue: {
        ...theme.typography.h3,
        color: theme.colors.primary,
    },
    summaryHint: {
        marginTop: theme.spacing.xs,
        color: theme.colors.textSecondary,
        fontSize: 12,
    },
    footer: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: theme.colors.surface,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        padding: theme.spacing.md,
    },
    payButton: {
        backgroundColor: theme.colors.primary,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
    },
    payButtonText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 16,
    },
});
