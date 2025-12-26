import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, SafeAreaView, ScrollView } from 'react-native';
import { calendarService, TimeSlot, AvailabilityPayload } from '../services/calendarService';
import { theme } from '../theme';

interface Props {
    route: {
        params: {
            staffEmail?: string;
            staffName?: string;
        }
    };
    navigation: any;
}

interface GeneratedSlot {
    start: Date;
    end: Date;
    available: boolean;
}

export const BookingScreen: React.FC<Props> = ({ route, navigation }) => {
    const { staffEmail = "officer@ampac.com", staffName = "Loan Officer" } = route.params || {};

    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [availability, setAvailability] = useState<AvailabilityPayload>({ busy: [], suggested: [], timeZone: 'UTC' });
    const [loading, setLoading] = useState(false);
    const [booking, setBooking] = useState(false);
    const [generatedSlots, setGeneratedSlots] = useState<GeneratedSlot[]>([]);

    // Generate next 7 days
    const dates = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i);
        return d;
    });

    useEffect(() => {
        fetchSlots();
    }, [selectedDate]);

    const fetchSlots = async () => {
        setLoading(true);
        // Fetch for the whole day
        const start = new Date(selectedDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(selectedDate);
        end.setHours(23, 59, 59, 999);

        const slots = await calendarService.getAvailableSlots(
            staffEmail,
            30,
            start.toISOString(),
            end.toISOString()
        );
        setAvailability(slots);
        setLoading(false);
    };

    useEffect(() => {
        if (!loading) {
            const slots = generateSlots(selectedDate, availability.busy);
            setGeneratedSlots(slots);
        }
    }, [loading, availability, selectedDate]);

    const generateSlots = (date: Date, busy: TimeSlot[]) => {
        const slots: GeneratedSlot[] = [];
        const startHour = 9;
        const endHour = 17;
        const duration = 30;

        let current = new Date(date);
        current.setHours(startHour, 0, 0, 0);

        const end = new Date(date);
        end.setHours(endHour, 0, 0, 0);

        while (current < end) {
            const slotStart = new Date(current);
            const slotEnd = new Date(current.getTime() + duration * 60000);

            // Check conflict
            const isBusy = busy.some(b => {
                const bStart = new Date(b.startTime);
                const bEnd = new Date(b.endTime);
                // Simple overlap check
                return (slotStart < bEnd && slotEnd > bStart);
            });

            slots.push({
                start: slotStart,
                end: slotEnd,
                available: !isBusy
            });

            current = slotEnd;
        }
        return slots;
    };

    const handleBook = async (slot: GeneratedSlot) => {
        setBooking(true);
        try {
            await calendarService.bookMeeting(
                staffEmail,
                30,
                slot.start.toISOString()
            );

            Alert.alert(
                "Booking Confirmed",
                `Meeting scheduled with ${staffName}.\nCheck your email for the invite.`,
                [{ text: "OK", onPress: () => navigation.goBack() }]
            );
        } catch (error: any) {
            Alert.alert("Booking Failed", error.message || "Please try another slot.");
        } finally {
            setBooking(false);
        }
    };

    const suggestedSlots = availability.suggested || [];

    const renderDateItem = ({ item }: { item: Date }) => {
        const isSelected = item.getDate() === selectedDate.getDate();
        return (
            <TouchableOpacity
                style={[styles.dateCard, isSelected && styles.dateCardSelected]}
                onPress={() => setSelectedDate(item)}
            >
                <Text style={[styles.dayText, isSelected && styles.textSelected]}>
                    {item.toLocaleDateString('en-US', { weekday: 'short' })}
                </Text>
                <Text style={[styles.dateText, isSelected && styles.textSelected]}>
                    {item.getDate()}
                </Text>
            </TouchableOpacity>
        );
    };

    const renderSlotItem = ({ item }: { item: GeneratedSlot }) => {
        const timeString = item.start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        return (
            <TouchableOpacity
                style={[styles.slotCard, !item.available && styles.slotDisabled]}
                disabled={!item.available || booking}
                onPress={() => handleBook(item)}
            >
                <Text style={[styles.slotText, !item.available && styles.textDisabled]}>
                    {timeString}
                </Text>
                <Text style={[styles.statusText, !item.available && styles.textDisabled]}>
                    {item.available ? "Available" : "Busy"}
                </Text>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={theme.typography.h2}>Schedule Call</Text>
                <Text style={theme.typography.body}>With {staffName}</Text>
            </View>

            <View style={styles.dateListContainer}>
                <FlatList
                    data={dates}
                    renderItem={renderDateItem}
                    keyExtractor={(item) => item.toISOString()}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.dateListContent}
                />
            </View>

            <View style={styles.slotsContainer}>
                {loading ? (
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                ) : (
                    <>
                        {suggestedSlots.length > 0 && (
                            <>
                                <Text style={[styles.sectionTitle, { marginBottom: theme.spacing.sm }]}>Suggested</Text>
                                <FlatList
                                    data={suggestedSlots}
                                    renderItem={({ item }) => {
                                        const startDate = new Date(item.startTime);
                                        const endDate = new Date(item.endTime);
                                        const display = startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                                        return (
                                            <TouchableOpacity
                                                style={styles.slotCard}
                                                disabled={booking}
                                                onPress={() => handleBook({ start: startDate, end: endDate, available: true })}
                                            >
                                                <Text style={styles.slotText}>{display}</Text>
                                                <Text style={styles.statusText}>Available</Text>
                                            </TouchableOpacity>
                                        );
                                    }}
                                    keyExtractor={(item) => item.startTime}
                                    contentContainerStyle={styles.slotsListContent}
                                />
                                <Text style={styles.sectionTitle}>More times</Text>
                            </>
                        )}
                        <FlatList
                            data={generatedSlots}
                            renderItem={renderSlotItem}
                            keyExtractor={(item) => item.start.toISOString()}
                            contentContainerStyle={styles.slotsListContent}
                            ListEmptyComponent={<Text style={styles.emptyText}>No slots available for this date.</Text>}
                        />
                    </>
                )}
            </View>

            {booking && (
                <View style={styles.overlay}>
                    <ActivityIndicator size="large" color="#fff" />
                    <Text style={{ color: '#fff', marginTop: 10 }}>Booking...</Text>
                </View>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        padding: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    dateListContainer: {
        paddingVertical: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    dateListContent: {
        paddingHorizontal: theme.spacing.md,
    },
    dateCard: {
        width: 60,
        height: 70,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: theme.borderRadius.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginRight: theme.spacing.sm,
        backgroundColor: theme.colors.surface,
    },
    dateCardSelected: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    dayText: {
        ...theme.typography.caption,
        marginBottom: 4,
    },
    dateText: {
        ...theme.typography.h3,
    },
    textSelected: {
        color: '#FFFFFF',
    },
    slotsContainer: {
        flex: 1,
        padding: theme.spacing.md,
    },
    sectionTitle: {
        ...theme.typography.h3,
        marginBottom: theme.spacing.md,
    },
    slotsListContent: {
        paddingBottom: theme.spacing.xl,
    },
    slotCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.md,
        marginBottom: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
    },
    slotDisabled: {
        backgroundColor: theme.colors.surfaceHighlight,
        borderColor: 'transparent',
        opacity: 0.6,
    },
    slotText: {
        ...theme.typography.body,
        fontWeight: '600',
    },
    statusText: {
        ...theme.typography.caption,
    },
    textDisabled: {
        color: theme.colors.textSecondary,
    },
    emptyText: {
        textAlign: 'center',
        marginTop: theme.spacing.xl,
        color: theme.colors.textSecondary,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    }
});
