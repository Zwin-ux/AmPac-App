import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput, ScrollView, Modal, Alert, Linking, Image, KeyboardAvoidingView, Platform, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';
import { Business, Event, User, FeedPost } from '../types';
import { getBusinesses } from '../services/network';
import { getEvents, createEvent } from '../services/events';
import { feedService } from '../services/feedService';
import { chatService } from '../services/chatService';
import { businessService } from '../services/businessService';
import { getCurrentUserId, isDevUser } from '../services/authUtils';
import { Ionicons } from '@expo/vector-icons';
import { format, formatDistanceToNow } from 'date-fns';
import { auth } from '../../firebaseConfig';
import { Timestamp } from 'firebase/firestore';
import { AMPAC_STAFF, StaffMember } from '../data/staff';
import AssistantBubble from '../components/AssistantBubble';
import { useToast } from '../context/ToastContext';
import EmptyState from '../components/ui/EmptyState';
import SkeletonLoader from '../components/SkeletonLoader';
import { directMessageService } from '../services/directMessageService';
import { DirectConversation } from '../types';
import CommentSection from '../components/CommentSection';

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
type SocialTab = 'feed' | 'chat' | 'network' | 'messages' | 'profile';

export default function SocialHubScreen() {
    const navigation = useNavigation<any>();
    const { showToast } = useToast();
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
    const [isCreateChannelMinimized, setIsCreateChannelMinimized] = useState(false);
    const [newChannelName, setNewChannelName] = useState('');
    const [newChannelDesc, setNewChannelDesc] = useState('');
    const [isPrivate, setIsPrivate] = useState(false);

    // --- FEED STATE ---
    const [feedItems, setFeedItems] = useState<(FeedPost | Event)[]>([]);
    const [loadingFeed, setLoadingFeed] = useState(false);
    const [showCreatePost, setShowCreatePost] = useState(false);
    const [newPostContent, setNewPostContent] = useState('');
    const [creatingPost, setCreatingPost] = useState(false);
    const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());

    // --- JOIN TEAM STATE ---
    const [showJoinTeam, setShowJoinTeam] = useState(false);
    const [joinInviteCode, setJoinInviteCode] = useState('');
    const [joiningTeam, setJoiningTeam] = useState(false);

    // --- NEW BUSINESS STATE ---
    const [showCreateBusiness, setShowCreateBusiness] = useState(false);
    const [newBusiness, setNewBusiness] = useState({ name: '', industry: '', bio: '' });
    const [creatingBusiness, setCreatingBusiness] = useState(false);

    // --- SHARED STATE ---
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [networkFilter, setNetworkFilter] = useState<'all' | 'staff' | 'businesses' | 'events'>('all');

    // --- MESSAGES STATE ---
    const [conversations, setConversations] = useState<DirectConversation[]>([]);
    const [totalUnreadMessages, setTotalUnreadMessages] = useState(0);

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
            const data = await feedService.getAlgorithmicFeed();
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
        
        // Subscribe to conversations and unread count
        const unsubscribeConversations = directMessageService.getConversations(setConversations);
        const unsubscribeUnread = directMessageService.getTotalUnreadCount(setTotalUnreadMessages);
        
        return () => {
            unsubscribeConversations();
            unsubscribeUnread();
        };
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
        if (!newEvent.title) return;
        setCreatingEvent(true);
        try {
            const { Timestamp } = await import('firebase/firestore');
            
            let eventDate;
            if (typeof newEvent.date === 'string' && newEvent.date) {
                const parsedDate = new Date(newEvent.date);
                if (isNaN(parsedDate.getTime())) {
                    eventDate = Timestamp.now();
                } else {
                    eventDate = Timestamp.fromDate(parsedDate);
                }
            } else {
                eventDate = Timestamp.now();
            }

            await createEvent({
                title: newEvent.title,
                description: newEvent.description,
                location: newEvent.location,
                date: eventDate as any,
                organizerBusinessId: auth.currentUser?.uid // Default to owner's biz
            });

            setShowCreateEventModal(false);
            setNewEvent({ title: '', description: '', location: '', date: '' });
            fetchEvents();
            showToast({ message: "Event posted!", type: 'success' });
        } catch (error) {
            showToast({ message: "Failed to post event.", type: 'error' });
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
            showToast({ message: "Community channel created!", type: 'success' });
        } catch (error) {
            console.error('Channel creation error', error);
            showToast({ message: "Failed to create channel.", type: 'error' });
        }
    };

    const handleCreatePost = async () => {
        if (!newPostContent.trim()) return;
        setCreatingPost(true);
        try {
            await feedService.createPost(
                newPostContent.trim(),
                'announcement',
                [],
                'ampac-community'
            );
            setShowCreatePost(false);
            setNewPostContent('');
            showToast({ message: "Post shared with the community!", type: 'success' });
        } catch (error) {
            showToast({ message: "Failed to share post.", type: 'error' });
        } finally {
            setCreatingPost(false);
        }
    };

    const handleCreateBusiness = async () => {
        if (!newBusiness.name.trim()) return;
        setCreatingBusiness(true);
        try {
            await businessService.createBusiness(
                newBusiness.name.trim(),
                newBusiness.industry.trim(),
                newBusiness.bio.trim()
            );

            setShowCreateBusiness(false);
            setNewBusiness({ name: '', industry: '', bio: '' });
            fetchBusinesses(true);
            showToast({ message: "Business group created!", type: 'success' });

            navigation.navigate('BusinessAdmin', { businessId: auth.currentUser?.uid });
        } catch (error) {
            showToast({ message: "Failed to create business.", type: 'error' });
        } finally {
            setCreatingBusiness(false);
        }
    };

    const handleJoinTeam = async () => {
        if (!joinInviteCode.trim()) return;
        setJoiningTeam(true);
        try {
            await businessService.joinBusiness(joinInviteCode.trim());
            setShowJoinTeam(false);
            setJoinInviteCode('');
            showToast({ message: "Joined business team!", type: 'success' });
            fetchBusinesses(true);
        } catch (error: any) {
            showToast({ message: error.message || "Failed to join team", type: 'error' });
        } finally {
            setJoiningTeam(false);
        }
    };

    const handleToggleRSVP = async (eventId: string, isJoining: boolean) => {
        const { toggleRSVP } = await import('../services/events');
        await toggleRSVP(eventId, isJoining);
        fetchEvents();
        showToast({
            message: isJoining ? "You're attending!" : "RSVP cancelled",
            type: 'success'
        });
    };

    // --- RENDER HELPERS ---
    const renderBadges = (badges?: string[]) => {
        if (!badges || badges.length === 0) return null;
        return (
            <View style={{ flexDirection: 'row', marginLeft: 6, gap: 4 }}>
                {badges.includes('Star Member') && <Ionicons name="star" size={12} color="#FF9800" />}
                {badges.includes('Top Contributor') && <Ionicons name="trophy" size={12} color="#FFC107" />}
            </View>
        );
    };

    const renderFeedItem = ({ item }: { item: FeedPost | Event }) => {
        if ('date' in item && 'location' in item && 'attendees' in item) {
            const eventItem = item as Event;
            return (
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <View style={[styles.avatarStats, { backgroundColor: theme.colors.secondary }]}>
                            <Ionicons name="calendar" size={20} color="#fff" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Text style={styles.cardTitle}>{eventItem.title}</Text>
                                {!!eventItem.pinned && <View style={styles.pinnedBadge}><Ionicons name="pin" size={10} color="#fff" /></View>}
                                {!!eventItem.featured && <View style={styles.featuredBadge}><Text style={styles.badgeText}>FEATURED</Text></View>}
                            </View>
                            <Text style={styles.cardSubtitle}>
                                {eventItem.date instanceof Timestamp ? format(eventItem.date.toDate(), 'PPPp') : eventItem.date}
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                                <Text style={[styles.cardSubtitle, { fontSize: 10 }]}>by {eventItem.organizerName}</Text>
                                {renderBadges(eventItem.organizerBadges)}
                            </View>
                        </View>
                    </View>
                    <Text style={styles.cardBody} numberOfLines={3}>{eventItem.description}</Text>
                    <View style={styles.cardFooter}>
                        <Ionicons name="location-outline" size={14} color="#666" />
                        <Text style={styles.footerText}>{eventItem.location}</Text>
                        <View style={{ flex: 1 }} />
                        <TouchableOpacity
                            style={[styles.attendBtn, eventItem.attendees?.includes(auth.currentUser?.uid || '') && styles.attendBtnActive]}
                            onPress={() => handleToggleRSVP(eventItem.id, !eventItem.attendees?.includes(auth.currentUser?.uid || ''))}
                        >
                            <Text style={[styles.attendBtnText, eventItem.attendees?.includes(auth.currentUser?.uid || '') && styles.attendBtnTextActive]}>
                                {eventItem.attendees?.includes(auth.currentUser?.uid || '') ? 'Attending' : 'Attend'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            );
        }

        const feedPostItem = item as FeedPost;
        return (
            <View style={styles.card}>
                <View style={styles.headerRow}>
                    <View style={[styles.avatarStats, { backgroundColor: theme.colors.primary }]}>
                        <Text style={styles.avatarTextStats}>{feedPostItem.authorName?.charAt(0) || '?'}</Text>
                    </View>
                    <View>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={styles.cardTitle}>{feedPostItem.authorName || 'Unknown'}</Text>
                            {renderBadges(feedPostItem.authorBadges)}
                            {!!feedPostItem.pinned && <View style={styles.pinnedBadge}><Ionicons name="pin" size={10} color="#fff" /></View>}
                            {!!feedPostItem.featured && <View style={styles.featuredBadge}><Text style={styles.badgeText}>FEATURED</Text></View>}
                        </View>
                        <Text style={styles.cardSubtitle}>{feedPostItem.type} • {feedPostItem.createdAt ? formatDistanceToNow(feedPostItem.createdAt.toDate(), { addSuffix: true }) : ''}</Text>
                    </View>
                    {(feedPostItem.authorId === getCurrentUserId()) && (
                        <TouchableOpacity 
                            style={{ marginLeft: 'auto', padding: 4 }}
                            onPress={() => {
                                Alert.alert(
                                    "Delete Post",
                                    "Are you sure you want to delete this post?",
                                    [
                                        { text: "Cancel", style: "cancel" },
                                        { 
                                            text: "Delete", 
                                            style: "destructive",
                                            onPress: async () => {
                                                try {
                                                    await feedService.deletePost(feedPostItem.id);
                                                    showToast({ message: "Post deleted", type: 'success' });
                                                    onRefresh(); // Refresh the feed
                                                } catch (error) {
                                                    showToast({ message: "Failed to delete post", type: 'error' });
                                                }
                                            }
                                        }
                                    ]
                                );
                            }}
                        >
                            <Ionicons name="trash-outline" size={18} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                    )}
                </View>
                <Text style={styles.cardBody}>{feedPostItem.content}</Text>
                <View style={styles.cardFooter}>
                    <TouchableOpacity onPress={() => feedService.toggleLike(feedPostItem.id)}>
                        <Ionicons
                            name={feedPostItem.likes?.includes(auth.currentUser?.uid || '') ? 'heart' : 'heart-outline'}
                            size={16}
                            color={feedPostItem.likes?.includes(auth.currentUser?.uid || '') ? '#FF5252' : 'gray'}
                        />
                    </TouchableOpacity>
                    <Text style={styles.footerText}>{feedPostItem.likes?.length || 0}</Text>
                    <TouchableOpacity
                        onPress={() => {
                            const newExpanded = new Set(expandedComments);
                            if (newExpanded.has(feedPostItem.id)) {
                                newExpanded.delete(feedPostItem.id);
                            } else {
                                newExpanded.add(feedPostItem.id);
                            }
                            setExpandedComments(newExpanded);
                        }}
                        style={{ marginLeft: 12, flexDirection: 'row', alignItems: 'center', gap: 4 }}
                    >
                        <Ionicons name="chatbubble-outline" size={16} color="gray" />
                        <Text style={styles.footerText}>{feedPostItem.commentCount || 0}</Text>
                    </TouchableOpacity>
                </View>

                {/* Entrepreneur Discussion Section */}
                {expandedComments.has(feedPostItem.id) && (
                    <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E2E8F0' }}>
                        <CommentSection
                            postId={feedPostItem.id}
                            postAuthorId={feedPostItem.authorId}
                            onCommentCountChange={(count) => {
                                setFeedItems(prev => prev.map(item =>
                                    'authorId' in item && item.id === feedPostItem.id
                                        ? { ...item, commentCount: count }
                                        : item
                                ));
                            }}
                        />
                    </View>
                )}
            </View>
        );
    };

    const renderNetworkContent = () => {
        let data: any[] = [];
        if (networkFilter === 'all' || networkFilter === 'staff') {
            data.push(...staff.map(s => ({ ...s, _type: 'staff' })));
        }
        if (networkFilter === 'all' || networkFilter === 'businesses') {
            data.push(...businesses.map(b => ({ ...b, _type: 'business' })));
        }
        if (networkFilter === 'all' || networkFilter === 'events') {
            data.push(...events.map(e => ({ ...e, _type: 'event' })));
        }

        if (searchQuery) {
            data = data.filter((d: any) => {
                const label = d?._type === 'event' ? d.title : d.name;
                return String(label || '').toLowerCase().includes(searchQuery.toLowerCase());
            });
        }


        return (
            <FlatList
                data={data}
                keyExtractor={(item: any) => `${item._type}-${item.id}`}
                contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
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
                            <View style={{ flex: 1 }}>
                                <Text style={styles.cardTitle}>{(item as any).name || (item as any).title}</Text>
                                <Text style={styles.cardSubtitle}>
                                    {item._type === 'event' ? (item as any).location : (item as any).title || (item as any).industry}
                                </Text>
                            </View>
                            {/* Add Message Button for Staff and Business Users */}
                            {(item._type === 'staff' || item._type === 'business') && item.id !== auth.currentUser?.uid && (
                                <TouchableOpacity
                                    style={styles.messageButton}
                                    onPress={async () => {
                                        try {
                                            const otherUserId = item.id;
                                            const otherUserName = item.name;
                                            const conversationId = await directMessageService.getOrCreateConversation(
                                                otherUserId,
                                                otherUserName
                                            );
                                            navigation.navigate('DirectMessages', {
                                                conversationId,
                                                otherUserId,
                                                otherUserName
                                            });
                                        } catch (error) {
                                            showToast({ message: 'Failed to start conversation', type: 'error' });
                                        }
                                    }}
                                >
                                    <Ionicons name="mail-outline" size={16} color={theme.colors.primary} />
                                    <Text style={styles.messageButtonText}>Message</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                )}
                ListHeaderComponent={
                    <View style={{ marginBottom: 16 }}>
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

                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <TouchableOpacity
                                style={[styles.joinBtn, { flex: 1 }]}
                                onPress={() => setShowJoinTeam(true)}
                            >
                                <Ionicons name="enter-outline" size={18} color={theme.colors.primary} />
                                <Text style={styles.joinBtnText}>Join a Team</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.joinBtn, { flex: 1, borderColor: theme.colors.textSecondary }]}
                                onPress={() => navigation.navigate('BusinessAdmin', { businessId: auth.currentUser?.uid })}
                            >
                                <Ionicons name="settings-outline" size={18} color={theme.colors.textSecondary} />
                                <Text style={[styles.joinBtnText, { color: theme.colors.textSecondary }]}>My Team</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                }
                ListEmptyComponent={
                    loadingBusinesses ? (
                        <View style={{ gap: 12, marginTop: 20 }}>
                            {[1, 2, 3].map(i => (
                                <View key={i} style={[styles.card, { flexDirection: 'row', gap: 12, alignItems: 'center' }]}>
                                    <SkeletonLoader width={40} height={40} borderRadius={20} />
                                    <View style={{ flex: 1, gap: 6 }}>
                                        <SkeletonLoader width="40%" height={14} />
                                        <SkeletonLoader width="60%" height={10} />
                                    </View>
                                </View>
                            ))}
                        </View>
                    ) : (
                        <EmptyState
                            title="Network is Empty"
                            description={searchQuery ? `No results for "${searchQuery}"` : "Connect with staff and local businesses."}
                            icon="people-outline"
                        />
                    )
                }
            />
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* --- HEADER --- */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Ecosystem</Text>
                <TouchableOpacity 
                    style={styles.headerSearchBtn}
                    onPress={() => setSearchQuery(searchQuery ? '' : ' ')}
                >
                    <Ionicons name="search" size={20} color={theme.colors.text} />
                </TouchableOpacity>
            </View>

            {/* --- TABS --- */}
            <View style={styles.tabBar}>
                <TouchableOpacity onPress={() => setActiveTab('feed')} style={[styles.tabItem, activeTab === 'feed' && styles.tabItemActive]}>
                    <Ionicons name="home-outline" size={18} color={activeTab === 'feed' ? theme.colors.primary : theme.colors.textSecondary} />
                    <Text style={[styles.tabText, activeTab === 'feed' && styles.tabTextActive]}>Home</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setActiveTab('network')} style={[styles.tabItem, activeTab === 'network' && styles.tabItemActive]}>
                    <Ionicons name="business-outline" size={18} color={activeTab === 'network' ? theme.colors.primary : theme.colors.textSecondary} />
                    <Text style={[styles.tabText, activeTab === 'network' && styles.tabTextActive]}>Network</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setActiveTab('chat')} style={[styles.tabItem, activeTab === 'chat' && styles.tabItemActive]}>
                    <Ionicons name="chatbubbles-outline" size={18} color={activeTab === 'chat' ? theme.colors.primary : theme.colors.textSecondary} />
                    <Text style={[styles.tabText, activeTab === 'chat' && styles.tabTextActive]}>Chat</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setActiveTab('messages')} style={[styles.tabItem, activeTab === 'messages' && styles.tabItemActive]}>
                    <View style={styles.messageTabContainer}>
                        <Ionicons name="mail-outline" size={18} color={activeTab === 'messages' ? theme.colors.primary : theme.colors.textSecondary} />
                        {totalUnreadMessages > 0 && (
                            <View style={styles.unreadBadge}>
                                <Text style={styles.unreadBadgeText}>{totalUnreadMessages > 99 ? '99+' : totalUnreadMessages}</Text>
                            </View>
                        )}
                    </View>
                    <Text style={[styles.tabText, activeTab === 'messages' && styles.tabTextActive]}>Messages</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setActiveTab('profile')} style={[styles.tabItem, activeTab === 'profile' && styles.tabItemActive]}>
                    <Ionicons name="person-outline" size={18} color={activeTab === 'profile' ? theme.colors.primary : theme.colors.textSecondary} />
                    <Text style={[styles.tabText, activeTab === 'profile' && styles.tabTextActive]}>Me</Text>
                </TouchableOpacity>
            </View>

            {/* --- CONTENT --- */}
            <View style={styles.content}>
                {activeTab === 'feed' && (
                    <ScrollView 
                        style={{ flex: 1 }}
                        contentContainerStyle={{ paddingBottom: 100 }}
                        refreshControl={
                            <RefreshControl refreshing={loadingFeed || refreshing} onRefresh={onRefresh} />
                        }
                    >
                        {/* Community Overview Card */}
                        <View style={styles.overviewCard}>
                            <View style={styles.overviewHeader}>
                                <Text style={styles.overviewTitle}>AmPac Ecosystem</Text>
                                <View style={styles.liveBadge}>
                                    <View style={styles.liveDot} />
                                    <Text style={styles.liveText}>LIVE</Text>
                                </View>
                            </View>
                            <View style={styles.statsRow}>
                                <View style={styles.statItem}>
                                    <Text style={styles.statNumber}>{businesses.length}</Text>
                                    <Text style={styles.statLabel}>Businesses</Text>
                                </View>
                                <View style={styles.statDivider} />
                                <View style={styles.statItem}>
                                    <Text style={styles.statNumber}>{events.length}</Text>
                                    <Text style={styles.statLabel}>Events</Text>
                                </View>
                                <View style={styles.statDivider} />
                                <View style={styles.statItem}>
                                    <Text style={styles.statNumber}>{staff.length}</Text>
                                    <Text style={styles.statLabel}>Staff</Text>
                                </View>
                            </View>
                        </View>

                        {/* Quick Actions Bar */}
                        <View style={styles.quickActionsBar}>
                            <TouchableOpacity style={styles.quickAction} onPress={() => setShowCreatePost(true)}>
                                <Ionicons name="create-outline" size={20} color={theme.colors.primary} />
                                <Text style={styles.quickActionText}>Post</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.quickAction} onPress={() => setShowCreateEventModal(true)}>
                                <Ionicons name="calendar-outline" size={20} color={theme.colors.secondary} />
                                <Text style={styles.quickActionText}>Event</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.quickAction} onPress={() => setShowCreateBusiness(true)}>
                                <Ionicons name="storefront-outline" size={20} color="#E65100" />
                                <Text style={styles.quickActionText}>Business</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.quickAction} onPress={() => setShowJoinTeam(true)}>
                                <Ionicons name="people-outline" size={20} color="#1565C0" />
                                <Text style={styles.quickActionText}>Join</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Upcoming Events - Horizontal */}
                        {events.length > 0 ? (
                            <View style={styles.horizontalSection}>
                                <View style={styles.sectionHeader}>
                                    <Text style={styles.sectionTitle}>Upcoming Events</Text>
                                    <TouchableOpacity onPress={() => setActiveTab('network')}>
                                        <Text style={styles.seeAllBtn}>See All</Text>
                                    </TouchableOpacity>
                                </View>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
                                    {events.slice(0, 5).map(event => (
                                        <TouchableOpacity key={event.id} style={styles.horizontalEventCard}>
                                            <View style={styles.eventDateBadge}>
                                                <Text style={styles.eventDay}>{format(event.date instanceof Timestamp ? event.date.toDate() : new Date(event.date), 'd')}</Text>
                                                <Text style={styles.eventMonth}>{format(event.date instanceof Timestamp ? event.date.toDate() : new Date(event.date), 'MMM')}</Text>
                                            </View>
                                            <Text style={styles.horizontalCardTitle} numberOfLines={2}>{event.title}</Text>
                                            <View style={styles.eventLocationRow}>
                                                <Ionicons name="location-outline" size={12} color={theme.colors.textSecondary} />
                                                <Text style={styles.eventLocationText} numberOfLines={1}>{event.location || 'TBD'}</Text>
                                            </View>
                                            <TouchableOpacity
                                                style={[styles.miniAttendBtn, event.attendees?.includes(auth.currentUser?.uid || '') && styles.miniAttendBtnActive]}
                                                onPress={() => handleToggleRSVP(event.id, !event.attendees?.includes(auth.currentUser?.uid || ''))}
                                            >
                                                <Text style={[styles.miniAttendBtnText, event.attendees?.includes(auth.currentUser?.uid || '') && styles.miniAttendBtnTextActive]}>
                                                    {event.attendees?.includes(auth.currentUser?.uid || '') ? '✓ Going' : 'RSVP'}
                                                </Text>
                                            </TouchableOpacity>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        ) : null}

                        {/* Featured Businesses - Horizontal */}
                        {businesses.length > 0 ? (
                            <View style={styles.horizontalSection}>
                                <View style={styles.sectionHeader}>
                                    <Text style={styles.sectionTitle}>Business Network</Text>
                                    <TouchableOpacity onPress={() => setActiveTab('network')}>
                                        <Text style={styles.seeAllBtn}>See All</Text>
                                    </TouchableOpacity>
                                </View>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
                                    {businesses.slice(0, 6).map(biz => (
                                        <TouchableOpacity 
                                            key={biz.id} 
                                            style={styles.horizontalBizCard}
                                            onPress={() => navigation.navigate('BusinessAdmin', { businessId: biz.id })}
                                        >
                                            <View style={[styles.bizAvatar, { backgroundColor: theme.colors.primary }]}>
                                                <Text style={styles.bizAvatarText}>{biz.name?.charAt(0) || '?'}</Text>
                                            </View>
                                            <Text style={styles.horizontalBizName} numberOfLines={1}>{biz.name}</Text>
                                            <Text style={styles.horizontalBizIndustry} numberOfLines={1}>{biz.industry || 'Business'}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        ) : null}

                        {/* AMPAC Staff - Horizontal */}
                        {staff.length > 0 ? (
                            <View style={styles.horizontalSection}>
                                <View style={styles.sectionHeader}>
                                    <Text style={styles.sectionTitle}>AMPAC Team</Text>
                                </View>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
                                    {staff.slice(0, 6).map(member => (
                                        <View key={member.id} style={styles.staffCard}>
                                            <View style={[styles.staffAvatar, { backgroundColor: theme.colors.secondary }]}>
                                                <Text style={styles.staffAvatarText}>{member.name?.charAt(0) || '?'}</Text>
                                            </View>
                                            <Text style={styles.staffName} numberOfLines={1}>{member.name}</Text>
                                            <Text style={styles.staffTitle} numberOfLines={1}>{member.title}</Text>
                                        </View>
                                    ))}
                                </ScrollView>
                            </View>
                        ) : null}

                        {/* Community Feed */}
                        <View style={styles.feedSection}>
                            <Text style={styles.sectionTitle}>Community Feed</Text>
                            {loadingFeed ? (
                                <View style={{ gap: 12 }}>
                                    {[1, 2, 3].map(i => (
                                        <View key={i} style={styles.card}>
                                            <View style={[styles.headerRow, { marginBottom: 12 }]}>
                                                <SkeletonLoader width={40} height={40} borderRadius={20} />
                                                <View style={{ flex: 1, gap: 6 }}>
                                                    <SkeletonLoader width="30%" height={14} />
                                                    <SkeletonLoader width="50%" height={10} />
                                                </View>
                                            </View>
                                            <SkeletonLoader width="100%" height={12} style={{ marginBottom: 6 }} />
                                            <SkeletonLoader width="80%" height={12} />
                                        </View>
                                    ))}
                                </View>
                            ) : feedItems.length > 0 ? (
                                feedItems.map(item => (
                                    <View key={item.id}>
                                        {renderFeedItem({ item })}
                                    </View>
                                ))
                            ) : (
                                <EmptyState
                                    title="No Community Posts"
                                    description="Be the first to share an announcement or ask a question!"
                                    icon="chatbubbles-outline"
                                    actionLabel="Create Post"
                                    onAction={() => setShowCreatePost(true)}
                                />
                            )}
                        </View>
                    </ScrollView>
                )}

                {activeTab === 'chat' && (
                    <ChannelList orgId="ampac-community" onChannelSelect={handleChannelSelect} />
                )}

                {activeTab === 'messages' && (
                    <View style={{ flex: 1 }}>
                        {conversations.length > 0 ? (
                            <FlatList
                                data={conversations}
                                keyExtractor={(item) => item.id}
                                contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
                                refreshControl={
                                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                                }
                                renderItem={({ item }) => {
                                    const currentUserId = directMessageService.getCurrentUserId() || '';
                                    const otherUserIndex = item.participants[0] === currentUserId ? 1 : 0;
                                    const otherUserName = item.participantNames[otherUserIndex] || 'User';
                                    const unreadCount = item.unreadCount[currentUserId] || 0;

                                    return (
                                        <TouchableOpacity
                                            style={styles.conversationItem}
                                            onPress={() => {
                                                navigation.navigate('DirectMessages', {
                                                    conversationId: item.id,
                                                    otherUserName
                                                });
                                            }}
                                        >
                                            <View style={styles.conversationAvatar}>
                                                <Ionicons name="person-circle" size={48} color={theme.colors.primary} />
                                            </View>
                                            
                                            <View style={styles.conversationContent}>
                                                <View style={styles.conversationHeader}>
                                                    <Text style={styles.conversationName}>{otherUserName}</Text>
                                                    {unreadCount > 0 && (
                                                        <View style={styles.conversationUnreadBadge}>
                                                            <Text style={styles.conversationUnreadText}>{unreadCount}</Text>
                                                        </View>
                                                    )}
                                                </View>
                                                
                                                {item.lastMessage && (
                                                    <Text style={styles.lastMessage} numberOfLines={1}>
                                                        {item.lastMessage.content}
                                                    </Text>
                                                )}
                                            </View>
                                        </TouchableOpacity>
                                    );
                                }}
                                ListEmptyComponent={
                                    <EmptyState
                                        title="No Messages Yet"
                                        description="Start conversations with other entrepreneurs in the community"
                                        icon="chatbubbles-outline"
                                        actionLabel="Browse Network"
                                        onAction={() => setActiveTab('network')}
                                    />
                                }
                            />
                        ) : (
                            <View style={{ flex: 1, padding: 16 }}>
                                <EmptyState
                                    title="No Messages Yet"
                                    description="Start conversations with other entrepreneurs in the community"
                                    icon="chatbubbles-outline"
                                    actionLabel="Browse Network"
                                    onAction={() => setActiveTab('network')}
                                />
                            </View>
                        )}
                    </View>
                )}

                {activeTab === 'network' && renderNetworkContent()}

                {activeTab === 'profile' && (
                    <View style={{ flex: 1 }}>
                        <ProfileScreen navigation={navigation} />
                    </View>
                )}

                {/* --- MINIMIZED CHANNEL BAR --- */}
                {isCreateChannelMinimized && (
                    <TouchableOpacity
                        style={styles.minimizedBar}
                        onPress={() => {
                            setIsCreateChannelMinimized(false);
                            setShowCreateChannel(true);
                        }}
                    >
                        <Ionicons name="chatbubbles" size={20} color="#fff" />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={styles.minimizedBarText}>
                                Drafting: {newChannelName || 'New Channel'}
                            </Text>
                        </View>
                        <Ionicons name="chevron-up" size={20} color="#fff" />
                    </TouchableOpacity>
                )}
            </View>

            {/* --- FAB (Contextual) --- */}
            {(activeTab === 'chat' || activeTab === 'feed' || activeTab === 'network') && (
                <TouchableOpacity
                    style={styles.fab}
                    onPress={() => {
                        if (activeTab === 'chat') setShowCreateChannel(true);
                        if (activeTab === 'feed') setShowCreatePost(true);
                        if (activeTab === 'network') setShowCreateBusiness(true);
                    }}
                >
                    <Ionicons name="add" size={24} color="#fff" />
                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>
                        {activeTab === 'chat' ? 'CHAT' : activeTab === 'feed' ? 'POST' : 'BIZ'}
                    </Text>
                </TouchableOpacity>
            )}

            {/* --- CREATE EVENT MODAL --- */}
            <Modal
                visible={showCreateEventModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowCreateEventModal(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <View style={styles.modalContent}>
                        <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
                            <View style={styles.modalHeader}>
                                <TouchableOpacity
                                    onPress={() => setShowCreateEventModal(false)}
                                    style={styles.headerIconButton}
                                >
                                    <Ionicons name="close-circle" size={32} color={theme.colors.secondary} />
                                    <Text style={[styles.minimizeText, { color: theme.colors.secondary }]}>Close</Text>
                                </TouchableOpacity>
                                <Text style={styles.modalTitle}>New Event</Text>
                                <View style={{ width: 60 }} />
                            </View>

                            <TextInput
                                style={styles.modalInput}
                                placeholder="Event Title"
                                value={newEvent.title}
                                onChangeText={(val) => setNewEvent({ ...newEvent, title: val })}
                            />

                            <TextInput
                                style={[styles.modalInput, styles.modalTextArea]}
                                placeholder="Description"
                                value={newEvent.description}
                                onChangeText={(val) => setNewEvent({ ...newEvent, description: val })}
                                multiline
                            />

                            <TextInput
                                style={styles.modalInput}
                                placeholder="Location (or Virtual Link)"
                                value={newEvent.location}
                                onChangeText={(val) => setNewEvent({ ...newEvent, location: val })}
                            />

                            <TextInput
                                style={styles.modalInput}
                                placeholder="Date (YYYY-MM-DD HH:MM)"
                                value={newEvent.date}
                                onChangeText={(val) => setNewEvent({ ...newEvent, date: val })}
                            />

                            <View style={styles.modalButtons}>
                                <TouchableOpacity onPress={() => setShowCreateEventModal(false)} style={styles.modalButtonCancel}>
                                    <Text style={styles.modalButtonTextCancel}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={handleCreateEvent}
                                    style={[styles.modalButtonPrimary, { backgroundColor: theme.colors.secondary }, (!newEvent.title.trim() || creatingEvent) && { opacity: 0.5 }]}
                                    disabled={!newEvent.title.trim() || creatingEvent}
                                >
                                    {creatingEvent ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.modalButtonTextPrimary}>Post Event</Text>}
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* --- CREATE CHANNEL MODAL --- */}
            <Modal
                visible={showCreateChannel}
                transparent
                animationType="slide"
                onRequestClose={() => setShowCreateChannel(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <View style={styles.modalContent}>
                        <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
                            <View style={styles.modalHeader}>
                                <TouchableOpacity
                                    onPress={() => {
                                        setShowCreateChannel(false);
                                        setIsCreateChannelMinimized(true);
                                    }}
                                    style={styles.headerIconButton}
                                >
                                    <Ionicons name="chevron-down-circle" size={32} color={theme.colors.primary} />
                                    <Text style={styles.minimizeText}>Minimize</Text>
                                </TouchableOpacity>
                                <Text style={styles.modalTitle}>New Channel</Text>
                                <View style={{ width: 60 }} />
                            </View>

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
                                <Text style={styles.modalLabel}>Private Channel?</Text>
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
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Join Team Modal */}
            <Modal
                visible={showJoinTeam}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowJoinTeam(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Join a Business Team</Text>
                            <TouchableOpacity onPress={() => setShowJoinTeam(false)}>
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.modalSubtitle}>
                            Enter the invite code shared by the business owner.
                        </Text>

                        <TextInput
                            style={styles.modalInput}
                            placeholder="Invite Code (e.g. ABC123)"
                            value={joinInviteCode}
                            onChangeText={(text) => setJoinInviteCode(text.toUpperCase())}
                            autoCapitalize="characters"
                        />

                        <TouchableOpacity
                            style={[styles.submitBtn, (!joinInviteCode.trim() || joiningTeam) && styles.submitBtnDisabled]}
                            onPress={handleJoinTeam}
                            disabled={!joinInviteCode.trim() || joiningTeam}
                        >
                            {joiningTeam ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.submitBtnText}>Join Team</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* --- CREATE POST MODAL --- */}
            <Modal
                visible={showCreatePost}
                transparent
                animationType="slide"
                onRequestClose={() => setShowCreatePost(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <View style={styles.modalContent}>
                        <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
                            <View style={styles.modalHeader}>
                                <TouchableOpacity
                                    onPress={() => setShowCreatePost(false)}
                                    style={styles.headerIconButton}
                                >
                                    <Ionicons name="close-circle" size={32} color={theme.colors.primary} />
                                    <Text style={styles.minimizeText}>Close</Text>
                                </TouchableOpacity>
                                <Text style={styles.modalTitle}>New Post</Text>
                                <View style={{ width: 60 }} />
                            </View>

                            <TextInput
                                style={[styles.modalInput, styles.modalTextArea, { minHeight: 120 }]}
                                placeholder="What's on your mind?"
                                value={newPostContent}
                                onChangeText={setNewPostContent}
                                multiline
                                autoFocus
                            />

                            <View style={styles.modalButtons}>
                                <TouchableOpacity onPress={() => setShowCreatePost(false)} style={styles.modalButtonCancel}>
                                    <Text style={styles.modalButtonTextCancel}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={handleCreatePost}
                                    style={[styles.modalButtonPrimary, (!newPostContent.trim() || creatingPost) && { opacity: 0.5 }]}
                                    disabled={!newPostContent.trim() || creatingPost}
                                >
                                    {creatingPost ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.modalButtonTextPrimary}>Post</Text>}
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* --- CREATE BUSINESS MODAL --- */}
            <Modal
                visible={showCreateBusiness}
                transparent
                animationType="slide"
                onRequestClose={() => setShowCreateBusiness(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <View style={styles.modalContent}>
                        <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
                            <View style={styles.modalHeader}>
                                <TouchableOpacity
                                    onPress={() => setShowCreateBusiness(false)}
                                    style={styles.headerIconButton}
                                >
                                    <Ionicons name="close-circle" size={32} color={theme.colors.primary} />
                                    <Text style={styles.minimizeText}>Close</Text>
                                </TouchableOpacity>
                                <Text style={styles.modalTitle}>List Your Business</Text>
                                <View style={{ width: 60 }} />
                            </View>

                            <TextInput
                                style={styles.modalInput}
                                placeholder="Business Name"
                                value={newBusiness.name}
                                onChangeText={(val) => setNewBusiness({ ...newBusiness, name: val })}
                            />

                            <TextInput
                                style={styles.modalInput}
                                placeholder="Industry (e.g. Retail)"
                                value={newBusiness.industry}
                                onChangeText={(val) => setNewBusiness({ ...newBusiness, industry: val })}
                            />

                            <TextInput
                                style={[styles.modalInput, styles.modalTextArea]}
                                placeholder="Short Bio / Description"
                                value={newBusiness.bio}
                                onChangeText={(val) => setNewBusiness({ ...newBusiness, bio: val })}
                                multiline
                            />

                            <View style={styles.modalButtons}>
                                <TouchableOpacity onPress={() => setShowCreateBusiness(false)} style={styles.modalButtonCancel}>
                                    <Text style={styles.modalButtonTextCancel}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={handleCreateBusiness}
                                    style={[styles.modalButtonPrimary, (!newBusiness.name.trim() || creatingBusiness) && { opacity: 0.5 }]}
                                    disabled={!newBusiness.name.trim() || creatingBusiness}
                                >
                                    {creatingBusiness ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.modalButtonTextPrimary}>Create</Text>}
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
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
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1a1a1a',
    },
    headerSearchBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#f0f0f0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabBar: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    tabItem: {
        flex: 1,
        flexDirection: 'column',
        alignItems: 'center',
        paddingVertical: 10,
        gap: 2,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    tabItemActive: {
        borderBottomColor: theme.colors.primary,
    },
    tabText: {
        fontSize: 11,
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
    // Quick Actions Bar
    quickActionsBar: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginBottom: 8,
        gap: 12,
    },
    quickAction: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8f9fa',
        paddingVertical: 12,
        borderRadius: 12,
        gap: 4,
    },
    quickActionText: {
        fontSize: 11,
        fontWeight: '600',
        color: theme.colors.text,
    },
    // Horizontal Sections
    horizontalSection: {
        marginBottom: 16,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 8,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1a1a1a',
    },
    seeAllBtn: {
        fontSize: 13,
        color: theme.colors.primary,
        fontWeight: '600',
    },
    // Horizontal Event Card
    horizontalEventCard: {
        width: 160,
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 12,
        marginRight: 12,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    eventDateBadge: {
        width: 44,
        height: 44,
        backgroundColor: theme.colors.secondary,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    eventDay: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
    },
    eventMonth: {
        fontSize: 10,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.8)',
        textTransform: 'uppercase',
    },
    horizontalCardTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    eventLocationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 8,
    },
    eventLocationText: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        flex: 1,
    },
    miniAttendBtn: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: theme.colors.secondary,
        alignItems: 'center',
    },
    miniAttendBtnActive: {
        backgroundColor: theme.colors.secondary,
    },
    miniAttendBtnText: {
        fontSize: 11,
        fontWeight: '600',
        color: theme.colors.secondary,
    },
    miniAttendBtnTextActive: {
        color: '#fff',
    },
    // Horizontal Business Card
    horizontalBizCard: {
        width: 100,
        alignItems: 'center',
        marginRight: 16,
    },
    bizAvatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 6,
    },
    bizAvatarText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
    },
    horizontalBizName: {
        fontSize: 13,
        fontWeight: '600',
        color: '#333',
        textAlign: 'center',
    },
    horizontalBizIndustry: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        textAlign: 'center',
    },
    // Staff Card
    staffCard: {
        width: 80,
        alignItems: 'center',
        marginRight: 16,
    },
    staffAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    staffAvatarText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
    },
    staffName: {
        fontSize: 12,
        fontWeight: '600',
        color: '#333',
        textAlign: 'center',
    },
    staffTitle: {
        fontSize: 10,
        color: theme.colors.textSecondary,
        textAlign: 'center',
    },
    // Feed Section
    feedSection: {
        padding: 16,
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
    modalLabel: {
        fontSize: 14,
        color: theme.colors.text,
        fontWeight: 'bold',
    },
    // Minimization Styles
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    headerIconButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 4,
        gap: 4,
    },
    minimizeText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: theme.colors.primary,
    },
    minimizedBar: {
        position: 'absolute',
        bottom: 20,
        left: 16,
        right: 16,
        backgroundColor: theme.colors.primary,
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        ...theme.shadows.card,
        zIndex: 1100,
    },
    minimizedBarText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    submitBtn: {
        backgroundColor: theme.colors.primary,
        borderRadius: 8,
        padding: 14,
        alignItems: 'center',
        marginTop: 10,
    },
    submitBtnDisabled: {
        backgroundColor: theme.colors.textSecondary,
        opacity: 0.7,
    },
    submitBtnText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    joinBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.colors.primary,
        backgroundColor: '#fff',
        marginTop: 8,
    },
    joinBtnText: {
        marginLeft: 8,
        fontSize: 14,
        fontWeight: 'bold',
        color: theme.colors.primary,
    },
    modalSubtitle: {
        ...theme.typography.body,
        color: theme.colors.textSecondary,
        marginBottom: 20,
        textAlign: 'center',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    attendBtn: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: theme.colors.secondary,
        backgroundColor: '#fff',
    },
    attendBtnActive: {
        backgroundColor: theme.colors.secondary,
    },
    attendBtnText: {
        fontSize: 13,
        fontWeight: 'bold',
        color: theme.colors.secondary,
    },
    attendBtnTextActive: {
        color: '#fff',
    },
    featuredBadge: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginLeft: 8,
    },
    pinnedBadge: {
        backgroundColor: '#FF6B6B',
        padding: 4,
        borderRadius: 12,
        marginLeft: 6,
    },
    badgeText: {
        color: '#fff',
        fontSize: 8,
        fontWeight: 'bold',
    },
    // Ecosystem Overview Styles
    overviewCard: {
        backgroundColor: '#fff',
        margin: 16,
        borderRadius: 16,
        padding: 16,
        ...theme.shadows.card,
    },
    overviewHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    overviewTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    liveBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEE2E2',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    liveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#EF4444',
    },
    liveText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#EF4444',
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statNumber: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.primary,
    },
    statLabel: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    statDivider: {
        width: 1,
        height: 30,
        backgroundColor: '#E2E8F0',
    },
    // Messages Tab Styles
    messageTabContainer: {
        position: 'relative',
    },
    unreadBadge: {
        position: 'absolute',
        top: -4,
        right: -8,
        backgroundColor: '#EF4444',
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    unreadBadgeText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
    },
    conversationItem: {
        flexDirection: 'row',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
        backgroundColor: '#fff',
        borderRadius: 12,
        marginBottom: 8,
        ...theme.shadows.card,
    },
    conversationAvatar: {
        marginRight: 12,
    },
    conversationContent: {
        flex: 1,
    },
    conversationHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    conversationName: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
    },
    conversationUnreadBadge: {
        backgroundColor: theme.colors.primary,
        borderRadius: 12,
        minWidth: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 8,
    },
    conversationUnreadText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
    lastMessage: {
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    messageButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: theme.colors.primary,
        backgroundColor: '#fff',
        gap: 4,
    },
    messageButtonText: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.primary,
    },
});
