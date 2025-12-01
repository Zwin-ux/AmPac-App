import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Contacts from 'expo-contacts';
import * as SMS from 'expo-sms';
import { theme } from '../theme';
import { Ionicons } from '@expo/vector-icons';

export default function InviteFriendsScreen({ navigation }: any) {
    const [contacts, setContacts] = useState<Contacts.Contact[]>([]);
    const [filteredContacts, setFilteredContacts] = useState<Contacts.Contact[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [permissionGranted, setPermissionGranted] = useState(false);

    useEffect(() => {
        (async () => {
            const { status } = await Contacts.requestPermissionsAsync();
            if (status === 'granted') {
                setPermissionGranted(true);
                const { data } = await Contacts.getContactsAsync({
                    fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Emails],
                    sort: Contacts.SortTypes.FirstName
                });

                if (data.length > 0) {
                    // Filter out contacts without phone numbers
                    const validContacts = data.filter(c => c.phoneNumbers && c.phoneNumbers.length > 0);
                    setContacts(validContacts);
                    setFilteredContacts(validContacts);
                }
            } else {
                Alert.alert("Permission Required", "We need access to your contacts to help you invite friends.");
            }
            setLoading(false);
        })();
    }, []);

    const handleSearch = (text: string) => {
        setSearchQuery(text);
        if (text) {
            const filtered = contacts.filter(contact => {
                const name = contact.name || `${contact.firstName} ${contact.lastName}`;
                return name.toLowerCase().includes(text.toLowerCase());
            });
            setFilteredContacts(filtered);
        } else {
            setFilteredContacts(contacts);
        }
    };

    const handleInvite = async (contact: Contacts.Contact) => {
        const isAvailable = await SMS.isAvailableAsync();
        if (isAvailable) {
            const phoneNumber = contact.phoneNumbers?.[0]?.number;
            if (phoneNumber) {
                const { result } = await SMS.sendSMSAsync(
                    [phoneNumber],
                    'Hey! Check out the AmPac app to grow your business. Download it here: https://ampac.com/app'
                );
            } else {
                Alert.alert("Error", "This contact does not have a valid phone number.");
            }
        } else {
            Alert.alert("Error", "SMS is not available on this device.");
        }
    };

    const renderItem = ({ item }: { item: Contacts.Contact }) => (
        <View style={styles.contactItem}>
            <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                    {item.firstName?.[0] || item.name?.[0] || '?'}
                </Text>
            </View>
            <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{item.name}</Text>
                <Text style={styles.contactPhone}>
                    {item.phoneNumbers?.[0]?.number}
                </Text>
            </View>
            <TouchableOpacity
                style={styles.inviteButton}
                onPress={() => handleInvite(item)}
            >
                <Text style={styles.inviteButtonText}>Invite</Text>
            </TouchableOpacity>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    if (!permissionGranted) {
        return (
            <View style={styles.centered}>
                <Text style={styles.emptyText}>Permission to access contacts was denied.</Text>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 20 }}>
                    <Text style={{ color: theme.colors.primary }}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Invite Friends</Text>
                <View style={{ width: 24 }} />
            </View>

            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color={theme.colors.textSecondary} style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search contacts..."
                    value={searchQuery}
                    onChangeText={handleSearch}
                />
            </View>

            <FlatList
                data={filteredContacts}
                renderItem={renderItem}
                keyExtractor={(item) => (item as any).id || (item as any).identifier || Math.random().toString()}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.centered}>
                        <Text style={styles.emptyText}>No contacts found.</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    backButton: {
        padding: 4,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        margin: theme.spacing.md,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    searchIcon: {
        marginRight: theme.spacing.sm,
    },
    searchInput: {
        flex: 1,
        paddingVertical: theme.spacing.md,
        fontSize: 16,
        color: theme.colors.text,
    },
    listContent: {
        paddingBottom: theme.spacing.xl,
    },
    contactItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: theme.spacing.md,
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: theme.colors.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme.spacing.md,
    },
    avatarText: {
        color: theme.colors.primary,
        fontWeight: 'bold',
        fontSize: 18,
    },
    contactInfo: {
        flex: 1,
    },
    contactName: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
    },
    contactPhone: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    inviteButton: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.borderRadius.round,
    },
    inviteButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    emptyText: {
        fontSize: 16,
        color: theme.colors.textSecondary,
        textAlign: 'center',
    },
});
