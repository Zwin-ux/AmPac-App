import { useState, useEffect, useRef } from 'react';
import { X, Send, Sparkles, ChevronDown } from 'lucide-react';

type Message = {
    id: string;
    text: string;
    sender: 'user' | 'ai';
    timestamp: number;
    flags?: {
        requires_human_review?: boolean;
    };
};

export default function CopilotSidebar() {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen, isMinimized]);

    const handleSend = async () => {
        if (!inputText.trim()) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            text: inputText.trim(),
            sender: 'user',
            timestamp: Date.now(),
        };

        setMessages(prev => [...prev, userMsg]);
        setInputText('');
        setIsLoading(true);

        // Call Backend API
        try {
            const { API_URL } = await import('../config');
            const response = await fetch(`${API_URL}/agents/copilot`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query: userMsg.text,
                    context: {
                        page: window.location.pathname,
                        role: 'staff_member'
                    }
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to fetch response');
            }

            const data = await response.json();

            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                text: data.response,
                sender: 'ai',
                timestamp: Date.now(),
                flags: data.flags // Assuming backend returns flags if needed
            };
            setMessages(prev => [...prev, aiMsg]);

        } catch (error) {
            console.error("Copilot Error:", error);
            const errorMsg: Message = {
                id: (Date.now() + 1).toString(),
                text: "Sorry, I'm having trouble connecting to the Brain. Please try again.",
                sender: 'ai',
                timestamp: Date.now(),
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 bg-primary text-white p-4 rounded-full shadow-lg hover:bg-primaryLight transition-all z-50 flex items-center gap-2"
            >
                <Sparkles className="w-6 h-6" />
                <span className="font-medium">Copilot</span>
            </button>
        );
    }

    if (isMinimized) {
        return (
            <div className="fixed bottom-6 right-6 flex flex-col items-end gap-2 z-50">
                <button
                    onClick={() => setIsMinimized(false)}
                    className="bg-surface border border-primary text-primary px-4 py-2 rounded-full shadow-lg hover:bg-primary hover:text-white transition-all flex items-center gap-2"
                >
                    <Sparkles className="w-4 h-4" />
                    <span className="text-xs font-bold">Resuming Chat...</span>
                </button>
            </div>
        );
    }

    return (
        <div className="w-96 bg-surface border-l border-border flex flex-col h-full shadow-xl transition-all duration-300 z-50">
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between bg-surfaceHighlight">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    <h2 className="font-bold text-text">Staff Copilot</h2>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setIsMinimized(true)}
                        className="p-1 hover:bg-gray-200 rounded text-textSecondary"
                        title="Minimize"
                    >
                        <ChevronDown className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-1 hover:bg-gray-200 rounded text-textSecondary"
                        title="Close"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {messages.length === 0 && (
                    <div className="text-center text-textSecondary mt-10">
                        <p className="text-sm">Ask me to summarize a loan, check policies, or draft emails.</p>
                    </div>
                )}
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-[85%] p-3 rounded-lg text-sm whitespace-pre-wrap ${msg.sender === 'user'
                                ? 'bg-primary text-white rounded-br-none'
                                : 'bg-white border border-border text-text rounded-bl-none shadow-sm'
                                }`}
                        >
                            {msg.text}
                            {msg.flags?.requires_human_review && (
                                <div className="mt-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded border border-yellow-200 flex items-center gap-1">
                                    ⚠️ Review before sending
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-white border border-border p-3 rounded-lg rounded-bl-none shadow-sm">
                            <div className="flex gap-1">
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75" />
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150" />
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-border bg-surface">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Ask Copilot..."
                        className="flex-1 p-2 border border-border rounded focus:ring-2 focus:ring-primary outline-none text-sm"
                        disabled={isLoading}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!inputText.trim() || isLoading}
                        className="p-2 bg-primary text-white rounded hover:bg-primaryLight disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
                <div className="text-xs text-center text-textSecondary mt-2">
                    AI can make mistakes. Verify all outputs.
                </div>
            </div>
        </div>
    );
}
