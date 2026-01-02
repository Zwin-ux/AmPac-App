import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';
import { Room } from '../types';
import { getRooms } from '../services/rooms';

import SkeletonLoader from '../components/SkeletonLoader';
import { Ionicons } from '@expo/vector-icons';

export default function SpacesScreen() {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [isHydrating, setIsHydrating] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedRooms, setSelectedRooms] = useState<Record<string, Room>>({});
    const navigation = useNavigation<any>();

    const categories = ['All', 'Conference Room', 'Training Center', 'Meeting Space'];

    const fetchRooms = useCallback(async (force = false) => {
        const data = await getRooms(force);
        setRooms(data);
        setIsHydrating(false);
        setRefreshing(false);
    }, []);

    useEffect(() => {
        // OPTIMISTIC: Fetch rooms (cache-first, so usually instant)
        fetchRooms();
    }, [fetchRooms]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchRooms(true);
    };

    // Mock filtering logic since our mock data might not have categories yet
    const filteredRooms = selectedCategory === 'All'
        ? rooms
        : rooms;

    const toggleSelection = (room: Room) => {
        setSelectedRooms((prev) => {
            const updated = { ...prev };
            if (updated[room.id]) {
                delete updated[room.id];
            } else {
                updated[room.id] = room;
            }
            return updated;
        });
    };

    const renderRoomItem = ({ item }: { item: Room }) => {
        const isSelected = !!selectedRooms[item.id];
        return (
            <TouchableOpacity
                style={[styles.card, isSelected && styles.cardSelected]}
                onPress={() => selectionMode ? toggleSelection(item) : navigation.navigate('RoomDetail', { roomId: item.id, room: item })}
                onLongPress={() => {
                    if (!selectionMode) setSelectionMode(true);
                    toggleSelection(item);
                }}
            >
                <View style={styles.imagePlaceholder}>
                    <Text style={styles.placeholderText}>Room Photo</Text>
                    <View style={styles.priceTag}>
                        <Text style={styles.priceTagText}>${item.pricePerHour}/hr</Text>
                    </View>
                    {selectionMode && (
                        <View style={[styles.selectionBadge, isSelected && styles.selectionBadgeActive]}>
                            <Ionicons name={isSelected ? 'checkmark' : 'add'} size={16} color={isSelected ? '#fff' : theme.colors.textSecondary} />
                        </View>
                    )}
                </View>
                <View style={styles.cardContent}>
                    <View style={styles.cardHeaderRow}>
                        <Text style={styles.roomName}>{item.name}</Text>
                        <View style={styles.tierBadge}>
                            <Text style={styles.tierText}>Tiered pricing</Text>
                        </View>
                    </View>
                    <Text style={styles.capacity}>Capacity: {item.capacity} people</Text>
                    <View style={styles.amenitiesContainer}>
                        {item.amenities.slice(0, 3).map((amenity: string, index: number) => (
                            <View key={index} style={styles.amenityBadge}>
                                <Text style={styles.amenityText}>{amenity}</Text>
                            </View>
                        ))}
                        {item.amenities.length > 3 && (
                            <Text style={styles.moreAmenities}>+{item.amenities.length - 3}</Text>
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    // OPTIMISTIC: Show skeleton while hydrating, but render layout immediately
    const renderSkeletonItem = () => (
        <View style={styles.card}>
            <SkeletonLoader width="100%" height={180} />
            <View style={styles.cardContent}>
                <SkeletonLoader width="60%" height={20} style={{ marginBottom: 8 }} />
                <SkeletonLoader width="40%" height={14} style={{ marginBottom: 12 }} />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    <SkeletonLoader width={60} height={24} borderRadius={8} />
                    <SkeletonLoader width={60} height={24} borderRadius={8} />
                </View>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => navigation.goBack?.()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
                    </TouchableOpacity>
                    <View>
                        <Text style={styles.title}>Rent a Space</Text>
                        <Text style={styles.subtitle}>Find the perfect room for your meeting.</Text>
                    </View>
                </View>
                <TouchableOpacity
                    style={[styles.multiToggle, selectionMode && styles.multiToggleActive]}
                    onPress={() => {
                        setSelectionMode((prev) => !prev);
                        setSelectedRooms({});
                    }}
                >
                    <Ionicons name="copy-outline" size={16} color={selectionMode ? '#fff' : theme.colors.text} />
                    <Text style={[styles.multiToggleText, selectionMode && styles.multiToggleTextActive]}>
                        {selectionMode ? 'Multi-room mode on' : 'Multi-room booking'}
                    </Text>
                </TouchableOpacity>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
                    {categories.map((cat) => (
                        <TouchableOpacity
                            key={cat}
                            style={[styles.filterChip, selectedCategory === cat && styles.filterChipActive]}
                            onPress={() => setSelectedCategory(cat)}
                        >
                            <Text style={[styles.filterText, selectedCategory === cat && styles.filterTextActive]}>{cat}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {isHydrating && rooms.length === 0 ? (
                <View style={styles.listContent}>
                    {renderSkeletonItem()}
                    {renderSkeletonItem()}
                </View>
            ) : (
                <FlatList
                    data={filteredRooms}
                    renderItem={renderRoomItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                />
            )}

            {selectionMode && Object.keys(selectedRooms).length > 0 && (
                <View style={styles.floatingBar}>
                    <View>
                        <Text style={styles.floatingTitle}>{Object.keys(selectedRooms).length} room(s) selected</Text>
                        <Text style={styles.floatingSubtext}>Bundle pricing + one checkout</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.floatingButton}
                        onPress={() => navigation.navigate('MultiRoomBooking', { rooms: Object.values(selectedRooms) })}
                    >
                        <Text style={styles.floatingButtonText}>Review booking</Text>
                    </TouchableOpacity>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        paddingHorizontal: theme.spacing.lg,
        paddingTop: theme.spacing.md,
        paddingBottom: theme.spacing.md,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
    },
    backButton: {
        padding: 8,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
    },
    title: {
        ...theme.typography.h1,
        marginBottom: theme.spacing.xs,
    },
    subtitle: {
        ...theme.typography.body,
        color: theme.colors.textSecondary,
    },
    listContent: {
        padding: theme.spacing.lg,
    },
    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        marginBottom: theme.spacing.lg,
        overflow: 'hidden',
        ...theme.shadows.card,
    },
    cardSelected: {
        borderColor: theme.colors.primary,
    },
    imagePlaceholder: {
        height: 180,
        backgroundColor: theme.colors.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderText: {
        color: theme.colors.textSecondary,
        fontWeight: '600',
    },
    cardContent: {
        padding: theme.spacing.md,
    },
    cardHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.xs,
    },
    roomName: {
        ...theme.typography.h3,
        color: theme.colors.text,
    },
    capacity: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.md,
    },
    amenitiesContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
    },
    amenityBadge: {
        backgroundColor: theme.colors.background,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        marginRight: 8,
        marginBottom: 6,
    },
    amenityText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        fontWeight: '500',
    },
    moreAmenities: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        fontWeight: '500',
    },
    filterContainer: {
        marginTop: theme.spacing.md,
        flexDirection: 'row',
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: theme.colors.surface,
        marginRight: 8,
        ...theme.shadows.card,
    },
    filterChipActive: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    filterText: {
        color: theme.colors.text,
        fontWeight: '500',
    },
    filterTextActive: {
        color: '#fff',
    },
    priceTag: {
        position: 'absolute',
        bottom: 12,
        right: 12,
        backgroundColor: 'rgba(0, 85, 150, 0.9)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    priceTagText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    selectionBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: theme.colors.border,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.85)',
    },
    selectionBadgeActive: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    multiToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
        marginTop: theme.spacing.md,
        gap: 6,
    },
    multiToggleActive: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    multiToggleText: {
        color: theme.colors.text,
        fontWeight: '600',
    },
    multiToggleTextActive: {
        color: '#fff',
    },
    floatingBar: {
        position: 'absolute',
        left: theme.spacing.lg,
        right: theme.spacing.lg,
        bottom: theme.spacing.lg,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        ...theme.shadows.card,
    },
    floatingButton: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: theme.borderRadius.md,
    },
    floatingButtonText: {
        color: '#fff',
        fontWeight: '700',
    },
    floatingTitle: {
        ...theme.typography.h3,
        fontSize: 16,
    },
    floatingSubtext: {
        color: theme.colors.textSecondary,
        fontSize: 12,
        marginTop: 2,
    },
    tierBadge: {
        backgroundColor: theme.colors.background,
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    tierText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        fontWeight: '600',
    },
});
