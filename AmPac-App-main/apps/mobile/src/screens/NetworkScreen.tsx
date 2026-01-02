import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput, ScrollView, Modal, Alert, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Timestamp } from 'firebase/firestore';
import { theme } from '../theme';
import { Business, Event, FeedPost } from '../types';
import { getBusinesses } from '../services/network';
import { getEvents, createEvent } from '../services/events';
import { feedService } from '../services/feedService';
import { Ionicons } from '@expo/vector-icons';

import { AMPAC_STAFF, StaffMember } from '../data/staff';


export default function NetworkScreen() {
    const [activeTab, setActiveTab] = useState<'businesses' | 'events' | 'feed' | 'staff'>('businesses');
    
    // Business State
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [loadingBusinesses, setLoadingBusinesses] = useState(true);
    
    // Staff State
    const [staff, setStaff] = useState<StaffMember[]>(AMPAC_STAFF);
    
    // Event State
    const [events, setEvents] = useState<Event[]>([]);
    const [loadingEvents, setLoadingEvents] = useState(false);
    const [showCreateEventModal, setShowCreateEventModal] = useState(false);
    const [newEvent, setNewEvent] = useState({ title: '', description: '', location: '', date: '' });
    const [creatingEvent, setCreatingEvent] = useState(false);

    // Feed State
    const [feedItems, setFeedItems] = useState<FeedPost[]>([]);
    const [loadingFeed, setLoadingFeed] = useState(false);

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

    const fetchFeed = async () => {
        setLoadingFeed(true);
        try {
            const data = await feedService.getFeed();
            setFeedItems(data);
        } catch (error) {
            console.error('Feed service error:', error);
            Alert.alert('Feed unavailable', 'Please try again in a moment.');
        } finally {
            setLoadingFeed(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchBusinesses();
        fetchEvents();
        fetchFeed();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        if (activeTab === 'businesses') {
            fetchBusinesses(true);
        } else if (activeTab === 'events') {
            fetchEvents();
        } else {
            fetchFeed();
        }
    };

    const handleCreateEvent = async () => {
        if (!newEvent.title || !newEvent.description || !newEvent.location) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        setCreatingEvent(true);
        try {
            const eventId = await createEvent({
                title: newEvent.title,
                description: newEvent.description,
                location: newEvent.location,
                date: Timestamp.now(), // Default to now
            });
            // Refresh events list
            const refreshedEvents = await getEvents();
            setEvents(refreshedEvents);
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

    const filteredFeed = feedItems.filter(item =>
        item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.authorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.type.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredStaff = AMPAC_STAFF.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleCall = (phone: string) => {
        Linking.openURL(`tel:${phone.replace(/\D/g, '')}`);
    };

    const renderStaffItem = ({ item }: { item: StaffMember }) => (
        <View style={styles.card}>
            <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.primary }]}>
                <Text style={[styles.avatarText, { color: '#fff' }]}>{item.name.charAt(0)}</Text>
            </View>
            <View style={styles.cardContent}>
                <Text style={styles.businessName}>{item.name}</Text>
                <Text style={styles.industry}>{item.title}</Text>
                <TouchableOpacity style={[styles.connectButton, { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]} onPress={() => handleCall(item.phone)}>
                    <Ionicons name="call-outline" size={16} color={theme.colors.primary} style={{ marginRight: 4 }} />
                    <Text style={styles.connectButtonText}>{item.phone}</Text>
                </TouchableOpacity>
            </View>
        </View>
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
                    {item.date?.toDate?.().toLocaleDateString() || 'TBD'} • {item.location}
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

    const getPostTypeIcon = (type: FeedPost['type']) => {
        const icons = {
            announcement: { name: 'megaphone-outline', color: '#64748B' },
            showcase: { name: 'image-outline', color: '#8B5CF6' },
            qa: { name: 'help-circle-outline', color: '#3B82F6' }
        };
        return icons[type] || { name: 'megaphone-outline', color: '#64748B' };
    };

    const renderFeedItem = ({ item }: { item: FeedPost }) => (
        <View style={styles.card}>
            <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.secondary }]}>
                <Text style={styles.avatarText}>{item.authorName.charAt(0)}</Text>
            </View>
            <View style={styles.cardContent}>
                <View style={styles.feedHeader}>
                    <Text style={styles.businessName}>{item.authorName}</Text>
                    <View style={styles.feedMeta}>
                        <Ionicons
                            name={getPostTypeIcon(item.type).name as any}
                            size={14}
                            color={getPostTypeIcon(item.type).color}
                            style={{ marginRight: 4 }}
                        />
                        <Text style={styles.feedType}>{item.type}</Text>
                    </View>
                </View>
                <Text style={styles.description} numberOfLines={3}>{item.content}</Text>
                <View style={styles.feedFooter}>
                    <View style={styles.feedStat}>
                        <Ionicons name="heart-outline" size={14} color={theme.colors.textSecondary} />
                        <Text style={styles.feedStatText}>{item.likes?.length || 0}</Text>
                    </View>
                    <View style={styles.feedStat}>
                        <Ionicons name="chatbubble-outline" size={14} color={theme.colors.textSecondary} />
                        <Text style={styles.feedStatText}>{item.commentCount || 0}</Text>
                    </View>
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
                        style={[styles.tab, activeTab === 'staff' && styles.activeTab]} 
                        onPress={() => setActiveTab('staff')}
                    >
                        <Text style={[styles.tabText, activeTab === 'staff' && styles.activeTabText]}>AmPac Team</Text>
                    </TouchableOpacity>
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
                    <TouchableOpacity 
                        style={[styles.tab, activeTab === 'feed' && styles.activeTab]} 
                        onPress={() => setActiveTab('feed')}
                    >
                        <Text style={[styles.tabText, activeTab === 'feed' && styles.activeTabText]}>Community</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.searchContainer}>
                    <TextInput
                        style={styles.searchInput}
                        placeholder={
                            activeTab === 'staff'
                                ? "Search team..."
                                : activeTab === 'businesses'
                                    ? "Search businesses..."
                                    : activeTab === 'events'
                                        ? "Search events..."
                                        : "Search posts..."
                        }
                        placeholderTextColor={theme.colors.textSecondary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {activeTab === 'businesses' && (
                        <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilters(!showFilters)}>
                            <Ionicons name="filter" size={20} color={theme.colors.text} />
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

            {activeTab === 'staff' ? (
                <FlatList
                    data={filteredStaff}
                    renderItem={renderStaffItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            ) : activeTab === 'businesses' ? (
                <FlatList
                    data={filteredBusinesses}
                    renderItem={renderBusinessItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                />
            ) : activeTab === 'events' ? (
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
            ) : (
                <FlatList
                    data={filteredFeed}
                    renderItem={renderFeedItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    ListEmptyComponent={
                        !loadingFeed ? (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyStateText}>No posts yet.</Text>
                                <TouchableOpacity onPress={() => Alert.alert('Tip', 'Share your first update from the feed tab.')}>
                                    <Text style={styles.emptyStateLink}>Be the first?</Text>
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
    feedHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    feedMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        columnGap: 6,
    },
    feedType: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        textTransform: 'capitalize',
    },
    feedFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        columnGap: 12,
        marginTop: 4,
    },
    feedStat: {
        flexDirection: 'row',
        alignItems: 'center',
        columnGap: 4,
    },
    feedStatText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
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
