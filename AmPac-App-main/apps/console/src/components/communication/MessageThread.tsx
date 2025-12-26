import { useState } from 'react';
import { Send, Lock, Globe } from 'lucide-react';
import type { Application } from '../../types';

interface MessageThreadProps {
    application: Application;
}

interface Message {
    id: string;
    text: string;
    sender: string;
    timestamp: Date;
    type: 'internal' | 'external';
    isStaff: boolean;
}

export default function MessageThread({ application }: MessageThreadProps) {
    const [activeTab, setActiveTab] = useState<'external' | 'internal'>('external');
    const [newMessage, setNewMessage] = useState('');

    // Mock messages
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            text: 'Hello, I have a question about the tax return requirement.',
            sender: 'Client',
            timestamp: new Date(Date.now() - 86400000),
            type: 'external',
            isStaff: false
        },
        {
            id: '2',
            text: 'Hi! Sure, what specific question do you have?',
            sender: 'Staff (You)',
            timestamp: new Date(Date.now() - 80000000),
            type: 'external',
            isStaff: true
        },
        {
            id: '3',
            text: 'Note: Client seems unsure about 2021 returns. Might need to call CPA.',
            sender: 'Staff (You)',
            timestamp: new Date(Date.now() - 70000000),
            type: 'internal',
            isStaff: true
        }
    ]);

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        const msg: Message = {
            id: Date.now().toString(),
            text: newMessage,
            sender: 'Staff (You)',
            timestamp: new Date(),
            type: activeTab,
            isStaff: true
        };

        setMessages([...messages, msg]);
        setNewMessage('');
    };

    const filteredMessages = messages.filter(m => m.type === activeTab);

    return (
        <div className="grid grid-cols-3 gap-6 h-[600px]">
            {/* Sidebar / Context */}
            <div className="col-span-1 space-y-6">
                <div className="bg-surface p-4 rounded-lg border border-border shadow-subtle">
                    <h3 className="font-semibold mb-2 text-primary">Communication Channels</h3>
                    <p className="text-sm text-textSecondary mb-4">
                        Switch between chatting with the client and internal team notes.
                    </p>

                    <div className="space-y-2">
                        <button
                            onClick={() => setActiveTab('external')}
                            className={`w-full flex items-center p-3 rounded-md transition-colors ${activeTab === 'external'
                                    ? 'bg-primary text-white'
                                    : 'bg-surfaceHighlight text-textSecondary hover:bg-gray-200'
                                }`}
                        >
                            <Globe className="w-4 h-4 mr-3" />
                            <div className="text-left">
                                <div className="font-medium">Client Thread</div>
                                <div className="text-xs opacity-80">Visible to borrower</div>
                            </div>
                        </button>

                        <button
                            onClick={() => setActiveTab('internal')}
                            className={`w-full flex items-center p-3 rounded-md transition-colors ${activeTab === 'internal'
                                    ? 'bg-yellow-100 text-yellow-900 border border-yellow-200'
                                    : 'bg-surfaceHighlight text-textSecondary hover:bg-gray-200'
                                }`}
                        >
                            <Lock className="w-4 h-4 mr-3" />
                            <div className="text-left">
                                <div className="font-medium">Internal Notes</div>
                                <div className="text-xs opacity-80">Staff only</div>
                            </div>
                        </button>
                    </div>
                </div>
            </div>

            {/* Chat Area */}
            <div className="col-span-2 flex flex-col bg-surface rounded-lg border border-border shadow-subtle overflow-hidden">
                <div className={`p-4 border-b border-border flex items-center ${activeTab === 'internal' ? 'bg-yellow-50' : 'bg-surfaceHighlight'
                    }`}>
                    {activeTab === 'internal' ? <Lock className="w-4 h-4 mr-2 text-yellow-700" /> : <Globe className="w-4 h-4 mr-2 text-primary" />}
                    <span className={`font-medium ${activeTab === 'internal' ? 'text-yellow-900' : 'text-primary'}`}>
                        {activeTab === 'internal' ? 'Internal Team Notes' : `Chat with ${application.businessName}`}
                    </span>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-surfaceHighlight">
                    {filteredMessages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.isStaff ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] rounded-lg p-3 ${msg.isStaff
                                    ? (activeTab === 'internal' ? 'bg-yellow-100 text-yellow-900' : 'bg-primary text-white')
                                    : 'bg-white border border-border text-text'
                                }`}>
                                <div className="text-xs opacity-70 mb-1 flex justify-between gap-4">
                                    <span>{msg.sender}</span>
                                    <span>{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <p className="text-sm">{msg.text}</p>
                            </div>
                        </div>
                    ))}
                    {filteredMessages.length === 0 && (
                        <div className="text-center text-textSecondary text-sm py-8">
                            No messages yet. Start the conversation.
                        </div>
                    )}
                </div>

                <form onSubmit={handleSend} className="p-4 border-t border-border bg-surface">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder={activeTab === 'internal' ? "Add a private note..." : "Type a message to the client..."}
                            className="flex-1 p-2 border border-border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                        />
                        <button
                            type="submit"
                            disabled={!newMessage.trim()}
                            className={`p-2 rounded-md text-white transition-colors ${activeTab === 'internal'
                                    ? 'bg-yellow-600 hover:bg-yellow-700'
                                    : 'bg-primary hover:bg-primaryLight'
                                }`}
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
