import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput, ScrollView, Modal, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';
import { Business, Event } from '../types';
import { getBusinesses } from '../services/network';
import { getEvents, createEvent } from '../services/events';
import { Ionicons } from '@expo/vector-icons';

import AssistantBubble from '../components/AssistantBubble';

export default function NetworkScreen() {
    const [activeTab, setActiveTab] = useState<'businesses' | 'events'>('businesses');
    
    // Business State
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [loadingBusinesses, setLoadingBusinesses] = useState(true);
    
    // Event State
    const [events, setEvents] = useState<Event[]>([]);
    const [loadingEvents, setLoadingEvents] = useState(false);
    const [showCreateEventModal, setShowCreateEventModal] = useState(false);
    const [newEvent, setNewEvent] = useState({ title: '', description: '', location: '', date: '' });
    const [creatingEvent, setCreatingEvent] = useState(false);

    // Shared State
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const navigation = useNavigation();

    const fetchBusinesses = async (force = false) => {
        const data = await getBusinesses(force);
        setBusinesses(data);
        setLoadingBusinesses(false);
        setRefreshing(false);
    };

    const fetchEvents = async () => {
        setLoadingEvents(true);
        const data = await getEvents();
        setEvents(data);
        setLoadingEvents(false);
        setRefreshing(false);
    };

    useEffect(() => {
        fetchBusinesses();
        fetchEvents();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        if (activeTab === 'businesses') {
            fetchBusinesses(true);
        } else {
            fetchEvents();
        }
    };

    const handleCreateEvent = async () => {
        if (!newEvent.title || !newEvent.description || !newEvent.location) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        setCreatingEvent(true);
        try {
            const created = await createEvent({
                title: newEvent.title,
                description: newEvent.description,
                location: newEvent.location,
                date: new Date().toISOString(), // Default to now for demo
                organizerId: 'current_user',
                organizerName: 'You'
            });
            setEvents([...events, created]);
            setShowCreateEventModal(false);
            setNewEvent({ title: '', description: '', location: '', date: '' });
            Alert.alert('Success', 'Event created successfully!');
        } catch (error) {
            Alert.alert('Error', 'Failed to create event');
        } finally {
            setCreatingEvent(false);
        }
    };

    const filteredBusinesses = businesses.filter(b =>
        b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.industry.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.city.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredEvents = events.filter(e => 
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.description.toLowerCase().includes(searchQuery.toLowerCase())
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

    const renderEventItem = ({ item }: { item: Event }) => (
        <View style={styles.card}>
            <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.secondary }]}>
                <Ionicons name="calendar" size={24} color="#fff" />
            </View>
            <View style={styles.cardContent}>
                <Text style={styles.businessName}>{item.title}</Text>
                <Text style={styles.industry}>
                    {new Date(item.date).toLocaleDateString()} • {item.location}
                </Text>
                <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
                <View style={styles.eventFooter}>
                    <Text style={styles.organizerText}>By: {item.organizerName}</Text>
                    <TouchableOpacity style={styles.connectButton} onPress={() => alert(`RSVP to ${item.title}`)}>
                        <Text style={styles.connectButtonText}>RSVP</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

    if (loadingBusinesses && activeTab === 'businesses') {
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
                <Text style={styles.subtitle}>Connect with local businesses & events.</Text>

                {/* Tabs */}
                <View style={styles.tabContainer}>
                    <TouchableOpacity 
                        style={[styles.tab, activeTab === 'businesses' && styles.activeTab]} 
                        onPress={() => setActiveTab('businesses')}
                    >
                        <Text style={[styles.tabText, activeTab === 'businesses' && styles.activeTabText]}>Businesses</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.tab, activeTab === 'events' && styles.activeTab]} 
                        onPress={() => setActiveTab('events')}
                    >
                        <Text style={[styles.tabText, activeTab === 'events' && styles.activeTabText]}>Events</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.searchContainer}>
                    <TextInput
                        style={styles.searchInput}
                        placeholder={activeTab === 'businesses' ? "Search businesses..." : "Search events..."}
                        placeholderTextColor={theme.colors.textSecondary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {activeTab === 'businesses' && (
                        <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilters(!showFilters)}>
                            <Text style={{ fontSize: 20 }}>🌪️</Text>
                        </TouchableOpacity>
                    )}
                    {activeTab === 'events' && (
                        <TouchableOpacity style={styles.addButton} onPress={() => setShowCreateEventModal(true)}>
                            <Ionicons name="add" size={24} color="#fff" />
                        </TouchableOpacity>
                    )}
                </View>

                {showFilters && activeTab === 'businesses' && (
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

            {activeTab === 'businesses' ? (
                <FlatList
                    data={filteredBusinesses}
                    renderItem={renderBusinessItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                />
            ) : (
                <FlatList
                    data={filteredEvents}
                    renderItem={renderEventItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    ListEmptyComponent={
                        !loadingEvents ? (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyStateText}>No events found.</Text>
                                <TouchableOpacity onPress={() => setShowCreateEventModal(true)}>
                                    <Text style={styles.emptyStateLink}>Create one?</Text>
                                </TouchableOpacity>
                            </View>
                        ) : null
                    }
                />
            )}

            {/* Create Event Modal */}
            <Modal
                visible={showCreateEventModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowCreateEventModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Create Event</Text>
                            <TouchableOpacity onPress={() => setShowCreateEventModal(false)}>
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>
                        
                        <Text style={styles.inputLabel}>Event Title</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="e.g. Networking Mixer"
                            value={newEvent.title}
                            onChangeText={t => setNewEvent({...newEvent, title: t})}
                        />

                        <Text style={styles.inputLabel}>Location</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="e.g. Conference Room A"
                            value={newEvent.location}
                            onChangeText={t => setNewEvent({...newEvent, location: t})}
                        />

                        <Text style={styles.inputLabel}>Description</Text>
                        <TextInput
                            style={[styles.modalInput, { height: 100, textAlignVertical: 'top' }]}
                            placeholder="Describe your event..."
                            multiline
                            value={newEvent.description}
                            onChangeText={t => setNewEvent({...newEvent, description: t})}
                        />

                        <TouchableOpacity 
                            style={[styles.createButton, creatingEvent && styles.disabledButton]} 
                            onPress={handleCreateEvent}
                            disabled={creatingEvent}
                        >
                            {creatingEvent ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.createButtonText}>Create Event</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

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
    tabContainer: {
        flexDirection: 'row',
        marginBottom: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    tab: {
        paddingVertical: theme.spacing.sm,
        marginRight: theme.spacing.lg,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    activeTab: {
        borderBottomColor: theme.colors.primary,
    },
    tabText: {
        fontSize: 16,
        color: theme.colors.textSecondary,
        fontWeight: '500',
    },
    activeTabText: {
        color: theme.colors.primary,
        fontWeight: 'bold',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: theme.spacing.sm,
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
    addButton: {
        marginLeft: theme.spacing.sm,
        padding: theme.spacing.sm,
        backgroundColor: theme.colors.primary,
        borderRadius: theme.borderRadius.md,
        justifyContent: 'center',
        alignItems: 'center',
        width: 48,
        height: 48,
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
        ...theme.shadows.float,
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
        color: theme.colors.secondary,
        fontWeight: '500',
        marginBottom: 4,
    },
    description: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: 12,
        lineHeight: 20,
    },
    eventFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4,
    },
    organizerText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        fontStyle: 'italic',
    },
    connectButton: {
        alignSelf: 'flex-start',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        backgroundColor: theme.colors.background,
        borderWidth: 1,
        borderColor: theme.colors.primary,
    },
    connectButtonText: {
        fontSize: 12,
        color: theme.colors.primary,
        fontWeight: '600',
    },
    emptyState: {
        alignItems: 'center',
        marginTop: 40,
    },
    emptyStateText: {
        fontSize: 16,
        color: theme.colors.textSecondary,
        marginBottom: 8,
    },
    emptyStateLink: {
        fontSize: 16,
        color: theme.colors.primary,
        fontWeight: 'bold',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: theme.spacing.lg,
        minHeight: 500,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.lg,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: 8,
    },
    modalInput: {
        backgroundColor: theme.colors.background,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        fontSize: 16,
        color: theme.colors.text,
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginBottom: theme.spacing.lg,
    },
    createButton: {
        backgroundColor: theme.colors.primary,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
        marginTop: theme.spacing.md,
    },
    disabledButton: {
        opacity: 0.7,
    },
    createButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
