import React from 'react';
import { useRoute, useNavigation } from '@react-navigation/native';
import { ChatScreen } from '../components/chat/ChatScreen.new';

export default function ChatScreenWrapper() {
    const route = useRoute<any>();
    const navigation = useNavigation();
    const { channelId, channelName, orgId } = route.params;

    return (
        <ChatScreen 
            orgId={orgId} 
            channelId={channelId} 
            channelName={channelName}
            onBack={() => navigation.goBack()}
        />
    );
}
