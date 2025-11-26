import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';
import { Business } from '../types';
import { getBusinesses } from '../services/network';

import AssistantBubble from '../components/AssistantBubble';

export default function NetworkScreen() {
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const navigation = useNavigation();

    const fetchBusinesses = async (force = false) => {
        const data = await getBusinesses(force);
        setBusinesses(data);
        setLoading(false);
        setRefreshing(false);
    };

    useEffect(() => {
        fetchBusinesses();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchBusinesses(true);
    };

    const filteredBusinesses = businesses.filter(b =>
        b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.industry.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.city.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderBusinessItem = ({ item }: { item: Business }) => (
        <View style={styles.card}>
            <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
            </View>
            <View style={styles.cardContent}>
                <Text style={styles.businessName}>{item.name}</Text>
                <Text style={styles.industry}>{item.industry} • {item.city}</Text>
                {item.description && (
                    <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
                )}
                <TouchableOpacity style={styles.connectButton} onPress={() => alert(`Request intro to ${item.name}`)}>
                    <Text style={styles.connectButtonText}>Request Intro</Text>
                </TouchableOpacity>
            </View>
        </View>
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
                <Text style={styles.title}>Network</Text>
                <Text style={styles.subtitle}>Connect with local businesses.</Text>

                <View style={styles.searchContainer}>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search businesses, industries..."
                        placeholderTextColor={theme.colors.textSecondary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilters(!showFilters)}>
                        <Text style={{ fontSize: 20 }}>🌪️</Text>
                    </TouchableOpacity>
                </View>

                {showFilters && (
                    <View style={styles.filterOptions}>
                        <Text style={styles.filterLabel}>Filter by City:</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {['All', 'Riverside', 'Ontario', 'San Bernardino'].map(city => (
                                <TouchableOpacity key={city} style={styles.cityChip} onPress={() => setSearchQuery(city === 'All' ? '' : city)}>
                                    <Text style={styles.cityChipText}>{city}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}
            </View>

            <FlatList
                data={filteredBusinesses}
                renderItem={renderBusinessItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                refreshing={refreshing}
                onRefresh={onRefresh}
            />
            <AssistantBubble context="network" />
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
        marginBottom: theme.spacing.md,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: theme.spacing.md,
    },
    searchInput: {
        flex: 1,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        fontSize: 16,
        color: theme.colors.text,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    filterButton: {
        marginLeft: theme.spacing.sm,
        padding: theme.spacing.sm,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    filterOptions: {
        marginTop: theme.spacing.md,
    },
    filterLabel: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.sm,
    },
    cityChip: {
        backgroundColor: theme.colors.surface,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        marginRight: 8,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    cityChipText: {
        fontSize: 14,
        color: theme.colors.text,
    },
    listContent: {
        padding: theme.spacing.lg,
    },
    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        marginBottom: theme.spacing.md,
        padding: theme.spacing.md,
        flexDirection: 'row',
        ...theme.shadows.card,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    avatarPlaceholder: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme.spacing.md,
        ...theme.shadows.float, // Add shadow to avatar
    },
    avatarText: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
    },
    cardContent: {
        flex: 1,
        justifyContent: 'center',
    },
    businessName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 2,
    },
    industry: {
        fontSize: 14,
        color: theme.colors.secondary, // Use secondary color for industry
        fontWeight: '500',
        marginBottom: 4,
    },
    description: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: 12,
        lineHeight: 20,
    },
    connectButton: {
        alignSelf: 'flex-start',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20, // More rounded button
        backgroundColor: theme.colors.background,
        borderWidth: 1,
        borderColor: theme.colors.primary,
    },
    connectButtonText: {
        fontSize: 12,
        color: theme.colors.primary,
        fontWeight: '600',
    },
});
