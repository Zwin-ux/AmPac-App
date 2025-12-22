import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Share, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { theme } from '../theme';
import { businessService } from '../services/businessService';
import { userStore } from '../services/userStore';
import { Business, BusinessRole, User } from '../types';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/ui/Button';
import { db } from '../../firebaseConfig';
import { getDoc, doc, collection, query, where, getDocs, updateDoc, arrayUnion } from 'firebase/firestore';
import { Event } from '../types';
import { graphCalendarService } from '../services/microsoftGraph';

export default function BusinessAdminScreen() {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const { showToast } = useToast();
    const { businessId } = route.params;

    const [business, setBusiness] = useState<Business | null>(null);
    const [members, setMembers] = useState<{ uid: string; role: BusinessRole; profile?: User }[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<'members' | 'insights' | 'integrations'>('members');
    const [stats, setStats] = useState({ totalRSVPs: 0, totalEvents: 0, engagement: 0 });
    const [m365Status, setM365Status] = useState<{ connected: boolean; email?: string }>({ connected: false });

    const currentUser = userStore.getCachedUser();
    const myRole = business?.members[currentUser?.uid || ''] || 'member';
    const isOwner = myRole === 'owner';
    const isAdmin = isOwner || myRole === 'admin';

    const loadData = async () => {
        try {
            const biz = await businessService.getBusiness(businessId);
            if (!biz) {
                showToast({ message: "Business not found", type: 'error' });
                navigation.goBack();
                return;
            }
            setBusiness(biz);

            // Fetch member profiles (defensive: biz.members may be undefined)
            const membersObj = biz.members || {};
            const memberList = await Promise.all(
                Object.entries(membersObj).map(async ([uid, role]) => {
                    try {
                        const userSnap = await getDoc(doc(db, 'users', uid));
                        return {
                            uid,
                            role,
                            profile: userSnap.exists() ? (userSnap.data() as User) : undefined
                        };
                    } catch (e) {
                        return { uid, role, profile: undefined };
                    }
                })
            );
            setMembers(memberList);

            // Calculate Stats for Insights
            const eventsRef = collection(db, 'events');
            const q = query(eventsRef, where('organizerId', '==', biz.ownerId));
            const eventSnap = await getDocs(q);
            let rsvps = 0;
            let engagement = 0;
            eventSnap.forEach(doc => {
                const data = doc.data() as Event;
                const attendeeCount = data.attendees?.length || 0;
                rsvps += attendeeCount;
                // Simple engagement score approximation: 10 points per RSVP
                engagement += (attendeeCount * 10);
            });
            setStats({
                totalEvents: eventSnap.size,
                totalRSVPs: rsvps,
                engagement
            });

            // Check M365 Status
            checkM365Status();

        } catch (error) {
            showToast({ message: "Failed to load team data", type: 'error' });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [businessId]);

    const handleInvite = async () => {
        if (!business?.inviteCode) return;
        try {
            await Share.share({
                message: `Join my business "${business.name}" on AmPac! Use invite code: ${business.inviteCode}`,
            });
        } catch (error) {
            showToast({ message: "Failed to share invite", type: 'error' });
        }
    };

    const handleRefreshCode = async () => {
        Alert.alert(
            "Refresh Invite Code?",
            "The old code will stop working immediately.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Refresh",
                    onPress: async () => {
                        const newCode = await businessService.refreshInviteCode(businessId);
                        setBusiness(prev => prev ? { ...prev, inviteCode: newCode } : null);
                        showToast({ message: "Invite code refreshed", type: 'success' });
                    }
                }
            ]
        );
    };

    const handleUpdateRole = async (memberUid: string, currentRole: BusinessRole) => {
        if (!isOwner && currentRole === 'owner') return; // Can't touch owner if not owner (and owner can't be touched anyway)

        const nextRole: BusinessRole = currentRole === 'member' ? 'admin' : 'member';

        Alert.alert(
            "Change Role",
            `Promote/Demote to ${nextRole}?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Confirm",
                    onPress: async () => {
                        await businessService.updateMemberRole(businessId, memberUid, nextRole);
                        loadData(); // Reload for simplicity
                        showToast({ message: "Role updated", type: 'success' });
                    }
                }
            ]
        );
    };

    const handleRemoveMember = async (memberUid: string, name: string) => {
        Alert.alert(
            "Remove Member",
            `Are you sure you want to remove ${name} from the business?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Remove",
                    style: 'destructive',
                    onPress: async () => {
                        await businessService.removeMember(businessId, memberUid);
                        loadData();
                        showToast({ message: "Member removed", type: 'success' });
                    }
                }
            ]
        );
    };

    const handleAwardBadge = async (memberUid: string) => {
        Alert.alert(
            "Award Badge",
            "Select a badge to award to this member:",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Star Member 🌟",
                    onPress: async () => {
                        await updateDoc(doc(db, 'users', memberUid), {
                            badges: arrayUnion('Star Member')
                        });
                        showToast({ message: "Badge awarded!", type: 'success' });
                    }
                },
                {
                    text: "Top Contributor 🏆",
                    onPress: async () => {
                        await updateDoc(doc(db, 'users', memberUid), {
                            badges: arrayUnion('Top Contributor')
                        });
                        showToast({ message: "Badge awarded!", type: 'success' });
                    }
                }
            ]
        );
    };

    const checkM365Status = async () => {
        const connected = await graphCalendarService.checkConnectionStatus();
        if (connected) {
            const profile = await graphCalendarService.getUserProfile();
            setM365Status({ connected: true, email: profile?.mail || profile?.userPrincipalName });
        } else {
            setM365Status({ connected: false });
        }
    };

    const handleConnectM365 = async () => {
        try {
            const token = await graphCalendarService.ensureSignedIn();
            if (token) {
                showToast({ message: "Microsoft 365 Connected", type: 'success' });
                checkM365Status();
            } else {
                showToast({ message: "Connection failed", type: 'error' });
            }
        } catch (error) {
            showToast({ message: "Connection error", type: 'error' });
        }
    };

    const handleDisconnectM365 = async () => {
        await graphCalendarService.signOut();
        setM365Status({ connected: false });
        showToast({ message: "Disconnected", type: 'info' });
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Team Management</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Tabs */}
            {isAdmin && (
                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'members' && styles.activeTab]}
                        onPress={() => setActiveTab('members')}
                    >
                        <Text style={[styles.tabText, activeTab === 'members' && styles.activeTabText]}>Members</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'insights' && styles.activeTab]}
                        onPress={() => setActiveTab('insights')}
                    >
                        <Text style={[styles.tabText, activeTab === 'insights' && styles.activeTabText]}>Insights</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'integrations' && styles.activeTab]}
                        onPress={() => setActiveTab('integrations')}
                    >
                        <Text style={[styles.tabText, activeTab === 'integrations' && styles.activeTabText]}>Integrations</Text>
                    </TouchableOpacity>
                </View>
            )}

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.bizHeader}>
                    <Text style={styles.bizName}>{business?.name}</Text>
                    <Text style={styles.bizIndustry}>{business?.industry}</Text>
                </View>

                {activeTab === 'members' ? (
                    <>
                        {/* Invite Section */}
                        {isAdmin && (
                            <View style={styles.inviteCard}>
                                <View style={styles.inviteInfo}>
                                    <Text style={styles.inviteLabel}>INVITE CODE</Text>
                                    <Text style={styles.inviteCode}>{business?.inviteCode}</Text>
                                </View>
                                <View style={styles.inviteActions}>
                                    <TouchableOpacity style={styles.inviteBtn} onPress={handleInvite}>
                                        <Ionicons name="share-outline" size={20} color={theme.colors.primary} />
                                        <Text style={styles.inviteBtnText}>Share</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.inviteBtn} onPress={handleRefreshCode}>
                                        <Ionicons name="refresh-outline" size={20} color={theme.colors.textSecondary} />
                                        <Text style={[styles.inviteBtnText, { color: theme.colors.textSecondary }]}>Reset</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        <Text style={styles.sectionTitle}>MEMBERS ({members.length})</Text>

                        {members.map((item) => (
                            <View key={item.uid} style={styles.memberCard}>
                                <View style={styles.memberAvatar}>
                                    <Text style={styles.avatarText}>{item.profile?.fullName?.charAt(0) || '?'}</Text>
                                </View>
                                <View style={styles.memberInfo}>
                                    <Text style={styles.memberName}>{item.profile?.fullName || 'Unknown User'}</Text>
                                    <View style={[styles.roleBadge, { backgroundColor: item.role === 'owner' ? theme.colors.accent : item.role === 'admin' ? '#E3F2FD' : '#F5F5F5' }]}>
                                        <Text style={[styles.roleText, { color: item.role === 'owner' ? '#fff' : item.role === 'admin' ? theme.colors.primary : '#666' }]}>
                                            {item.role.toUpperCase()}
                                        </Text>
                                    </View>
                                </View>

                                {isAdmin && item.uid !== currentUser?.uid && item.role !== 'owner' && (
                                    <View style={styles.memberActions}>
                                        <TouchableOpacity
                                            style={styles.actionBtn}
                                            onPress={() => handleAwardBadge(item.uid)}
                                        >
                                            <Ionicons name="star-outline" size={20} color="#FF9800" />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.actionBtn}
                                            onPress={() => handleUpdateRole(item.uid, item.role)}
                                        >
                                            <Ionicons name="shield-outline" size={20} color={theme.colors.primary} />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.actionBtn}
                                            onPress={() => handleRemoveMember(item.uid, item.profile?.fullName || 'User')}
                                        >
                                            <Ionicons name="trash-outline" size={20} color="#FF5252" />
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        ))}
                    </>
                ) : (
                    <View style={styles.insightsContainer}>
                        <View style={styles.statCard}>
                            <View style={styles.statIconBox}>
                                <Ionicons name="people" size={24} color={theme.colors.primary} />
                            </View>
                            <View>
                                <Text style={styles.statValue}>{members.length}</Text>
                                <Text style={styles.statLabel}>Team Members</Text>
                            </View>
                        </View>

                        <View style={styles.statRow}>
                            <View style={[styles.statCard, { flex: 1, marginRight: 8 }]}>
                                <View style={[styles.statIconBox, { backgroundColor: '#FFF3E0' }]}>
                                    <Ionicons name="calendar" size={24} color="#F57C00" />
                                </View>
                                <View>
                                    <Text style={styles.statValue}>{stats.totalEvents}</Text>
                                    <Text style={styles.statLabel}>Hosted Events</Text>
                                </View>
                            </View>
                            <View style={[styles.statCard, { flex: 1, marginLeft: 8 }]}>
                                <View style={[styles.statIconBox, { backgroundColor: '#E8F5E9' }]}>
                                    <Ionicons name="checkmark-circle" size={24} color="#388E3C" />
                                </View>
                                <View>
                                    <Text style={styles.statValue}>{stats.totalRSVPs}</Text>
                                    <Text style={styles.statLabel}>Total RSVPs</Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.scoreCard}>
                            <Text style={styles.scoreTitle}>Community Engagement Score</Text>
                            <Text style={styles.scoreValue}>{stats.engagement}</Text>
                            <Text style={styles.scoreSubtitle}>Based on event attendance interactions.</Text>
                            <View style={styles.progressBar}>
                                <View style={[styles.progressFill, { width: `${Math.min(stats.engagement, 100)}%` }]} />
                            </View>
                        </View>
                    </View>
                )}

                {activeTab === 'integrations' && (
                    <View style={styles.sectionContainer}>
                        <View style={styles.integrationCard}>
                            <View style={styles.integrationHeader}>
                                <Ionicons name="logo-microsoft" size={32} color="#00A4EF" />
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                    <Text style={styles.cardTitle}>Microsoft 365</Text>
                                    <Text style={styles.cardSubtitle}>Sync calendar & contacts</Text>
                                </View>
                                {m365Status.connected ? (
                                    <View style={[styles.statusBadge, { backgroundColor: '#E8F5E9' }]}>
                                        <Text style={[styles.statusText, { color: '#2E7D32' }]}>CONNECTED</Text>
                                    </View>
                                ) : (
                                    <View style={[styles.statusBadge, { backgroundColor: '#F5F5F5' }]}>
                                        <Text style={[styles.statusText, { color: '#666' }]}>NOT LINKED</Text>
                                    </View>
                                )}
                            </View>

                            {m365Status.connected && m365Status.email && (
                                <View style={styles.accountInfo}>
                                    <Text style={styles.accountLabel}>Linked Account:</Text>
                                    <Text style={styles.accountValue}>{m365Status.email}</Text>
                                </View>
                            )}

                            <View style={styles.integrationActions}>
                                {m365Status.connected ? (
                                    <Button
                                        title="Disconnect"
                                        onPress={handleDisconnectM365}
                                        variant="secondary"
                                        style={{ borderColor: '#FF5252' }}
                                        textStyle={{ color: '#FF5252' }}
                                    />
                                ) : (
                                    <Button
                                        title="Connect Account"
                                        onPress={handleConnectM365}
                                        style={{ backgroundColor: '#00A4EF' }}
                                    />
                                )}
                            </View>
                        </View>
                    </View>
                )}

            </ScrollView>

            {/* If member, maybe show Chat button? */}
            {business?.chatChannelId && (
                <View style={styles.footer}>
                    <Button
                        title="Go to Business Chat"
                        onPress={() => navigation.navigate('Chat', { channelId: business.chatChannelId!, channelName: `${business.name} (Internal)` })}
                        icon="chatbubbles"
                    />
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
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        ...theme.typography.h3,
    },
    scrollContent: {
        padding: theme.spacing.lg,
    },
    bizHeader: {
        marginBottom: theme.spacing.xl,
        alignItems: 'center',
    },
    bizName: {
        ...theme.typography.h1,
        textAlign: 'center',
    },
    bizIndustry: {
        ...theme.typography.body,
        color: theme.colors.textSecondary,
        marginTop: 4,
    },
    inviteCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.xl,
        ...theme.shadows.card,
    },
    inviteInfo: {
        alignItems: 'center',
        marginBottom: theme.spacing.md,
    },
    inviteLabel: {
        ...theme.typography.label,
        color: theme.colors.textSecondary,
        letterSpacing: 1,
        marginBottom: 8,
    },
    inviteCode: {
        fontSize: 32,
        fontWeight: '900',
        color: theme.colors.primary,
        letterSpacing: 4,
    },
    inviteActions: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 20,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        paddingTop: theme.spacing.md,
    },
    inviteBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    inviteBtnText: {
        fontWeight: 'bold',
        color: theme.colors.primary,
    },
    sectionTitle: {
        ...theme.typography.label,
        marginBottom: theme.spacing.md,
        color: theme.colors.textSecondary,
    },
    memberCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: theme.spacing.md,
        borderRadius: 12,
        marginBottom: theme.spacing.sm,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    memberAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: theme.colors.surfaceHighlight,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme.spacing.md,
    },
    avatarText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    memberInfo: {
        flex: 1,
    },
    memberName: {
        ...theme.typography.body,
        fontWeight: 'bold',
    },
    roleBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        marginTop: 4,
    },
    roleText: {
        fontSize: 10,
        fontWeight: '900',
    },
    memberActions: {
        flexDirection: 'row',
        gap: 12,
    },
    actionBtn: {
        padding: 8,
    },
    footer: {
        padding: theme.spacing.lg,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        backgroundColor: '#fff',
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#f0f0f0',
        borderRadius: 8,
        padding: 4,
        marginBottom: theme.spacing.xl,
    },
    tab: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 6,
    },
    activeTab: {
        backgroundColor: '#fff',
        ...theme.shadows.subtle,
    },
    tabText: {
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    activeTabText: {
        color: theme.colors.text,
    },
    insightsContainer: {
        gap: theme.spacing.md,
    },
    statCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: theme.spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        ...theme.shadows.subtle,
    },
    statRow: {
        flexDirection: 'row',
    },
    statIconBox: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#E3F2FD',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme.spacing.md,
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    statLabel: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        fontWeight: '600',
    },
    scoreCard: {
        backgroundColor: theme.colors.text, // Dark background
        borderRadius: 16,
        padding: theme.spacing.lg,
        marginTop: theme.spacing.md,
    },
    scoreTitle: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
        opacity: 0.8,
        marginBottom: 8,
    },
    scoreValue: {
        color: '#fff',
        fontSize: 36,
        fontWeight: '900',
        marginBottom: 4,
    },
    scoreSubtitle: {
        color: '#fff',
        fontSize: 12,
        opacity: 0.6,
        marginBottom: 16,
    },
    progressBar: {
        height: 6,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 3,
    },
    progressFill: {
        height: '100%',
        backgroundColor: theme.colors.accent,
        borderRadius: 3,
    },
    // Integration Styles
    sectionContainer: {
        gap: theme.spacing.md,
    },
    integrationCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: theme.spacing.lg,
        ...theme.shadows.subtle,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 2,
    },
    cardSubtitle: {
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    integrationHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.lg,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    statusText: {
        fontWeight: 'bold',
        fontSize: 10,
    },
    accountInfo: {
        backgroundColor: '#F8F9FA',
        padding: 12,
        borderRadius: 8,
        marginBottom: theme.spacing.lg,
    },
    accountLabel: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginBottom: 2,
    },
    accountValue: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
    },
    integrationActions: {
        marginTop: 4,
    }
});
