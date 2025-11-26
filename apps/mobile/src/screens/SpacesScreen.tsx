import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';
import { Room } from '../types';
import { getRooms } from '../services/rooms';
import AssistantBubble from '../components/AssistantBubble';

export default function SpacesScreen() {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const navigation = useNavigation<any>();

    const categories = ['All', 'Meeting Room', 'Desk', 'Event Space', 'Private Office'];

    const fetchRooms = async (force = false) => {
        const data = await getRooms(force);
        setRooms(data);
        setLoading(false);
        setRefreshing(false);
    };

    useEffect(() => {
        fetchRooms();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchRooms(true);
    };

    // Mock filtering logic since our mock data might not have categories yet
    const filteredRooms = selectedCategory === 'All'
        ? rooms
        : rooms;

    const renderRoomItem = ({ item }: { item: Room }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('RoomDetail', { roomId: item.id, room: item })}
        >
            <View style={styles.imagePlaceholder}>
                <Text style={styles.placeholderText}>Room Photo</Text>
                <View style={styles.priceTag}>
                    <Text style={styles.priceTagText}>${item.pricePerHour}/hr</Text>
                </View>
            </View>
            <View style={styles.cardContent}>
                <View style={styles.headerRow}>
                    <Text style={styles.roomName}>{item.name}</Text>
                </View>
                <Text style={styles.capacity}>Capacity: {item.capacity} people</Text>
                <View style={styles.amenitiesContainer}>
                    {item.amenities.slice(0, 3).map((amenity, index) => (
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

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Rent a Space</Text>
                <Text style={styles.subtitle}>Find the perfect room for your meeting.</Text>

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

            <FlatList
                data={filteredRooms}
                renderItem={renderRoomItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                refreshing={refreshing}
                onRefresh={onRefresh}
            />
            <AssistantBubble context="spaces" />
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
        borderWidth: 1,
        borderColor: theme.colors.border,
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
    headerRow: {
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
        borderWidth: 1,
        borderColor: theme.colors.border,
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
        backgroundColor: 'rgba(0, 85, 150, 0.9)', // Primary color with opacity
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        backdropFilter: 'blur(10px)', // Note: backdropFilter is web-only, but good for intent
    },
    priceTagText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
});
