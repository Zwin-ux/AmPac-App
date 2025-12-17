import React, { useState } from 'react';
import { View, StyleSheet, SafeAreaView, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ChannelList } from '../components/chat/ChannelList';
import { auth } from '../../firebaseConfig';

export default function ChatListScreen() {
    const navigation = useNavigation<any>();
    // In a real app, you'd get the user's current Org ID from context/store
    // For MVP/Demo, we can default to a "General" org or the user's ID
    const [orgId] = useState('ampac-community'); 

    const handleChannelSelect = (channel: any) => {
        navigation.navigate('Chat', {
            channelId: channel.id,
            channelName: channel.name,
            orgId: channel.orgId
        });
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Messages</Text>
            </View>
            <ChannelList 
                orgId={orgId} 
                onChannelSelect={handleChannelSelect} 
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
    },
});
