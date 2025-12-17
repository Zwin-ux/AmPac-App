import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput, ScrollView, Modal, Alert, Linking, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';
import { Business, Event, User, FeedPost } from '../types';
import { getBusinesses } from '../services/network';
import { getEvents, createEvent } from '../services/events';
import { feedService } from '../services/feedService';
import { chatService } from '../services/chatService';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { auth } from '../../firebaseConfig';
import { AMPAC_STAFF, StaffMember } from '../data/staff';
import AssistantBubble from '../components/AssistantBubble';

// Components
import { ChannelList } from '../components/chat/ChannelList';
import ProfileScreen from './ProfileScreen'; // Re-using ProfileScreen content? 
// Actually ProfileScreen is a full screen component. Let's see if we can render it as a child.
// ProfileScreen expects navigation. We can pass it. 
// Or we can duplicate the profile logic here to avoid navigation header conflicts if any.
// ProfileScreen has its own SafeAreaView and Header. We might want to use a "ProfileView" component instead.
// For now, I will wrap ProfileScreen but might need to adjust it to not use SafeAreaView if nested.
// Just rendering it as is might double headers/safe areas. 
// Let's create a simplified Profile View inside this file or just render ProfileScreen and accept the double header potential for now (or hide this header).

// Let's define the Tabs
type SocialTab = 'feed' | 'chat' | 'network' | 'profile';

export default function SocialHubScreen() {
    const navigation = useNavigation<any>();
    const [activeTab, setActiveTab] = useState<SocialTab>('feed');
    
    // --- NETWORK STATE ---
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [loadingBusinesses, setLoadingBusinesses] = useState(true);
    const [staff, setStaff] = useState<StaffMember[]>(AMPAC_STAFF);
    const [events, setEvents] = useState<Event[]>([]);
    const [loadingEvents, setLoadingEvents] = useState(false);
    const [showCreateEventModal, setShowCreateEventModal] = useState(false);
    const [newEvent, setNewEvent] = useState({ title: '', description: '', location: '', date: '' });
    const [creatingEvent, setCreatingEvent] = useState(false);
    
    // --- CHAT STATE ---
    const [showCreateChannel, setShowCreateChannel] = useState(false);
    const [newChannelName, setNewChannelName] = useState('');
    const [newChannelDesc, setNewChannelDesc] = useState('');
    const [isPrivate, setIsPrivate] = useState(false);
    
    // --- FEED STATE ---
    const [feedItems, setFeedItems] = useState<FeedPost[]>([]);
    const [loadingFeed, setLoadingFeed] = useState(false);
    
    // --- SHARED STATE ---
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [networkFilter, setNetworkFilter] = useState<'all' | 'staff' | 'businesses' | 'events'>('all');

    // --- DATA FETCHING ---
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
            console.error('Feed error', error);
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
        if (activeTab === 'feed') fetchFeed();
        if (activeTab === 'network') { fetchBusinesses(true); fetchEvents(); }
        // Chat handles its own subscriptions
        setRefreshing(false); // Fallback
    };

    // --- HANDLERS ---
    const handleChannelSelect = (channel: any) => {
        navigation.navigate('Chat', {
            channelId: channel.id,
            channelName: channel.name,
            orgId: channel.orgId
        });
    };

    const handleCreateEvent = async () => {
         // ... (Same logic as NetworkScreen)
         if (!newEvent.title) return;
         setCreatingEvent(true);
         try {
             // Mock create
             const created: Event = {
                 id: Date.now().toString(),
                 title: newEvent.title,
                 description: newEvent.description,
                 location: newEvent.location,
                 date: new Date().toISOString(),
                 organizerId: auth.currentUser?.uid || 'user',
                 organizerName: auth.currentUser?.displayName || 'You',
                 attendees: []
             };
             setEvents([...events, created]);
             setShowCreateEventModal(false);
             setNewEvent({ title: '', description: '', location: '', date: '' });
         } finally {
             setCreatingEvent(false);
         }
    };

    const handleCreateChannel = async () => {
        if (!newChannelName.trim()) {
            Alert.alert("Required", "Please enter a channel name");
            return;
        }
        try {
            await chatService.createChannel(
                'ampac-community', 
                newChannelName.trim(), 
                isPrivate ? 'private' : 'public',
                newChannelDesc
            );
            setShowCreateChannel(false);
            setNewChannelName('');
            setNewChannelDesc('');
            Alert.alert("Success", "Channel created!");
        } catch (error) {
            Alert.alert("Error", "Failed to create channel.");
        }
    };

    // --- RENDER HELPERS ---
    const renderFeedItem = ({ item }: { item: FeedPost }) => (
        <View style={styles.card}>
            <View style={styles.headerRow}>
                <View style={[styles.avatarStats, { backgroundColor: theme.colors.primary }]}>
                    <Text style={styles.avatarTextStats}>{item.authorName?.charAt(0) || '?'}</Text>
                </View>
                <View>
                    <Text style={styles.cardTitle}>{item.authorName || 'Unknown'}</Text>
                    <Text style={styles.cardSubtitle}>{item.type} • {item.createdAt ? formatDistanceToNow(item.createdAt.toDate(), { addSuffix: true }) : ''}</Text>
                </View>
            </View>
            <Text style={styles.cardBody}>{item.content}</Text>
            <View style={styles.cardFooter}>
                <Ionicons name="heart-outline" size={16} color="gray" />
                <Text style={styles.footerText}>{item.likes?.length || 0}</Text>
            </View>
        </View>
    );

    const renderNetworkContent = () => {
        let data = [];
        // Simple merge for 'all' or filter
        if (networkFilter === 'all' || networkFilter === 'staff') {
            data.push(...staff.map(s => ({ ...s, _type: 'staff' })));
        }
        if (networkFilter === 'all' || networkFilter === 'businesses') {
            data.push(...businesses.map(b => ({ ...b, _type: 'business' })));
        }
        if (networkFilter === 'all' || networkFilter === 'events') {
            data.push(...events.map(e => ({ ...e, _type: 'event' })));
        }

        // Filter by search
        if (searchQuery) {
            data = data.filter(d => 
                (d.name || d.title || '').toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        return (
            <FlatList
                data={data}
                keyExtractor={(item: any) => item.id}
                contentContainerStyle={{ padding: 16 }}
                renderItem={({ item }: { item: any }) => (
                    <View style={styles.card}>
                        <View style={styles.headerRow}>
                            <View style={[styles.avatarStats, { backgroundColor: item._type === 'event' ? theme.colors.secondary : theme.colors.surfaceHighlight }]}>
                                <Ionicons 
                                    name={item._type === 'event' ? 'calendar' : item._type === 'staff' ? 'person' : 'business'} 
                                    size={20} 
                                    color={theme.colors.text} 
                                />
                            </View>
                            <View>
                                <Text style={styles.cardTitle}>{(item as any).name || (item as any).title}</Text>
                                <Text style={styles.cardSubtitle}>
                                    {item._type === 'event' ? (item as any).location : (item as any).title || (item as any).industry}
                                </Text>
                            </View>
                        </View>
                    </View>
                )}
                ListHeaderComponent={
                    <View style={styles.filterRow}>
                         {['all', 'staff', 'businesses', 'events'].map(f => (
                             <TouchableOpacity 
                                key={f} 
                                style={[styles.filterChip, networkFilter === f && styles.filterChipActive]}
                                onPress={() => setNetworkFilter(f as any)}
                             >
                                 <Text style={[styles.filterText, networkFilter === f && styles.filterTextActive]}>
                                     {f.charAt(0).toUpperCase() + f.slice(1)}
                                 </Text>
                             </TouchableOpacity>
                         ))}
                    </View>
                }
            />
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* --- HEADER --- */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Social Hub</Text>
            </View>

            {/* --- TABS --- */}
            <View style={styles.tabBar}>
                <TouchableOpacity onPress={() => setActiveTab('feed')} style={[styles.tabItem, activeTab === 'feed' && styles.tabItemActive]}>
                    <Text style={[styles.tabText, activeTab === 'feed' && styles.tabTextActive]}>Community</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setActiveTab('chat')} style={[styles.tabItem, activeTab === 'chat' && styles.tabItemActive]}>
                    <Text style={[styles.tabText, activeTab === 'chat' && styles.tabTextActive]}>Chat</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setActiveTab('network')} style={[styles.tabItem, activeTab === 'network' && styles.tabItemActive]}>
                    <Text style={[styles.tabText, activeTab === 'network' && styles.tabTextActive]}>Network</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setActiveTab('profile')} style={[styles.tabItem, activeTab === 'profile' && styles.tabItemActive]}>
                    <Text style={[styles.tabText, activeTab === 'profile' && styles.tabTextActive]}>Profile</Text>
                </TouchableOpacity>
            </View>

            {/* --- CONTENT --- */}
            <View style={styles.content}>
                {activeTab === 'feed' && (
                    <FlatList
                        data={feedItems}
                        renderItem={renderFeedItem}
                        keyExtractor={item => item.id}
                        contentContainerStyle={{ padding: 16 }}
                        refreshing={loadingFeed || refreshing}
                        onRefresh={onRefresh}
                    />
                )}
                
                {activeTab === 'chat' && (
                    <ChannelList orgId="ampac-community" onChannelSelect={handleChannelSelect} />
                )}

                {activeTab === 'network' && renderNetworkContent()}

                {activeTab === 'profile' && (
                    <View style={{ flex: 1 }}>
                        <ProfileScreen navigation={navigation} />
                    </View>
                )}
            </View>

            {/* --- FAB for Create Channel (Only on Chat tab) --- */}
            {activeTab === 'chat' && (
                <TouchableOpacity 
                    style={styles.fab} 
                    onPress={() => setShowCreateChannel(true)}
                >
                    <Ionicons name="add" size={24} color="#fff" />
                </TouchableOpacity>
            )}

            {/* --- CREATE CHANNEL MODAL --- */}
            <Modal
                visible={showCreateChannel}
                transparent
                animationType="slide"
                onRequestClose={() => setShowCreateChannel(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>New Channel</Text>
                        
                        <TextInput
                            style={styles.modalInput}
                            placeholder="Channel Name (e.g. #marketing)"
                            value={newChannelName}
                            onChangeText={setNewChannelName}
                            autoCapitalize="none"
                        />
                        
                        <TextInput
                            style={[styles.modalInput, styles.modalTextArea]}
                            placeholder="Description (Optional)"
                            value={newChannelDesc}
                            onChangeText={setNewChannelDesc}
                            multiline
                        />

                        <View style={styles.privacyRow}>
                            <Text>Private Channel?</Text>
                             {/* Simple Switch substitute */}
                            <TouchableOpacity onPress={() => setIsPrivate(!isPrivate)}>
                                <Ionicons 
                                    name={isPrivate ? "checkbox" : "square-outline"} 
                                    size={24} 
                                    color={theme.colors.primary} 
                                />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity onPress={() => setShowCreateChannel(false)} style={styles.modalButtonCancel}>
                                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleCreateChannel} style={styles.modalButtonPrimary}>
                                <Text style={styles.modalButtonTextPrimary}>Create</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    header: {
        padding: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1a1a1a',
    },
    tabBar: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    tabItem: {
        paddingVertical: 12,
        marginRight: 24,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    tabItemActive: {
        borderBottomColor: theme.colors.primary,
    },
    tabText: {
        fontSize: 15,
        color: '#666',
        fontWeight: '500',
    },
    tabTextActive: {
        color: theme.colors.primary,
        fontWeight: 'bold',
    },
    content: {
        flex: 1,
    },
    // Card Styles adapted from NetworkScreen
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    avatarStats: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarTextStats: {
        color: '#fff',
        fontWeight: 'bold',
    },
    cardTitle: {
        fontWeight: 'bold',
        fontSize: 16,
        color: '#333',
    },
    cardSubtitle: {
        color: '#666',
        fontSize: 12,
    },
    cardBody: {
        color: '#444',
        marginBottom: 12,
        lineHeight: 20,
    },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    footerText: {
        marginLeft: 6,
        color: '#666',
        fontSize: 12,
    },
    // Filter Chips
    filterRow: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    filterChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: '#eee',
        marginRight: 8,
    },
    filterChipActive: {
        backgroundColor: theme.colors.primary,
    },
    filterText: {
        fontSize: 13,
        color: '#666',
    },
    filterTextActive: {
        color: '#fff',
        fontWeight: 'bold',
    },
    // FAB
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 24,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 24,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
        textAlign: 'center',
    },
    modalInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
        fontSize: 16,
    },
    modalTextArea: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
    privacyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    modalButtonCancel: {
        padding: 12,
        flex: 1,
        marginRight: 8,
        alignItems: 'center',
    },
    modalButtonPrimary: {
        padding: 12,
        backgroundColor: theme.colors.primary,
        borderRadius: 8,
        flex: 1,
        marginLeft: 8,
        alignItems: 'center',
    },
    modalButtonTextCancel: {
        color: '#666',
        fontWeight: '600',
    },
    modalButtonTextPrimary: {
        color: '#fff',
        fontWeight: 'bold',
    },
});
