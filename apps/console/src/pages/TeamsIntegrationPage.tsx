import { useState, useEffect } from 'react';
import { Users, MessageSquare, Search, Plus, MoreVertical } from 'lucide-react';

// Mock data for development
export interface TeamIntegration {
    id: string;
    teamName: string;
    teamId: string;
    connectedAt: Date;
    status: 'active' | 'disconnected' | 'error';
    lastSync: Date;
}

export interface ChatIntegration {
    id: string;
    chatId: string;
    participantEmails: string[];
    createdAt: Date;
    lastMessage: string;
    lastMessageAt: Date;
}

export default function TeamsIntegrationPage() {
    const [teams, setTeams] = useState<TeamIntegration[]>([]);
    const [chats, setChats] = useState<ChatIntegration[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
    const [newTeam, setNewTeam] = useState({
        teamName: '',
        teamId: ''
    });

    useEffect(() => {
        // Mock data - in a real implementation, this would connect to Microsoft Graph
        const mockTeams: TeamIntegration[] = [
            {
                id: '1',
                teamName: 'Loan Processing Team',
                teamId: 'team-123',
                connectedAt: new Date(Date.now() - 86400000),
                status: 'active',
                lastSync: new Date(Date.now() - 3600000)
            },
            {
                id: '2',
                teamName: 'Underwriting Team',
                teamId: 'team-456',
                connectedAt: new Date(Date.now() - 172800000),
                status: 'active',
                lastSync: new Date(Date.now() - 7200000)
            }
        ];

        const mockChats: ChatIntegration[] = [
            {
                id: '1',
                chatId: 'chat-123',
                participantEmails: ['john@ampac.com', 'jane@borrower.com'],
                createdAt: new Date(Date.now() - 3600000),
                lastMessage: 'Thanks for the update!',
                lastMessageAt: new Date(Date.now() - 1800000)
            },
            {
                id: '2',
                chatId: 'chat-456',
                participantEmails: ['mike@ampac.com', 'sarah@borrower.com'],
                createdAt: new Date(Date.now() - 7200000),
                lastMessage: 'Let me check on that.',
                lastMessageAt: new Date(Date.now() - 3600000)
            }
        ];

        setTeams(mockTeams);
        setChats(mockChats);
        setLoading(false);
    }, []);

    const filteredTeams = teams.filter(team => 
        team.teamName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        team.teamId.includes(searchTerm)
    );

    const filteredChats = chats.filter(chat => 
        chat.participantEmails.some(email => email.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const handleCreateTeam = async () => {
        try {
            setLoading(true);
            // In a real implementation, this would call Microsoft Graph to create a team

            // For now, we'll just add to local state
            setTeams([...teams, {
                id: Math.random().toString(36).substring(2, 9),
                teamName: newTeam.teamName,
                teamId: newTeam.teamId,
                connectedAt: new Date(),
                status: 'active',
                lastSync: new Date()
            }]);
            
            setShowCreateTeamModal(false);
            setNewTeam({ teamName: '', teamId: '' });
        } catch (error) {
            console.error('Error creating team:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSyncTeam = async (teamId: string) => {
        try {
            // In a real implementation, this would sync data with Microsoft Teams
            setTeams(teams.map(team => 
                team.id === teamId ? { ...team, lastSync: new Date() } : team
            ));
        } catch (error) {
            console.error('Error syncing team:', error);
        }
    };

    const getStatusBadge = (status: TeamIntegration['status']) => {
        const colors = {
            active: 'bg-green-100 text-green-800',
            disconnected: 'bg-yellow-100 text-yellow-800',
            error: 'bg-red-100 text-red-800'
        };
        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status]}`}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
        );
    };

    return (
        <div className="p-8">
            <header className="mb-8">
                <h1 className="text-2xl font-bold text-primary">Microsoft Teams Integration</h1>
                <p className="text-textSecondary mt-1">Manage Teams connections and chat integrations</p>
            </header>

            {/* Teams Section */}
            <div className="bg-surface rounded-lg border border-border shadow-subtle overflow-hidden mb-8">
                <div className="px-6 py-4 border-b border-border flex flex-col md:flex-row justify-between items-center bg-surfaceHighlight gap-4">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="relative flex-1 md:flex-none">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-textSecondary" />
                            <input
                                type="text"
                                placeholder="Search teams..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 pr-4 py-2 bg-surface border border-border rounded-lg w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>
                    </div>
                    <button
                        onClick={() => setShowCreateTeamModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primaryLight transition-colors w-full md:w-auto"
                    >
                        <Plus className="w-5 h-5" />
                        Connect Team
                    </button>
                </div>

                {loading ? (
                    <div className="p-8 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                        <p className="mt-4 text-textSecondary">Loading teams...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-surface border-b border-border">
                                <tr>
                                    <th className="px-6 py-3 font-medium text-textSecondary uppercase tracking-wider">Team Name</th>
                                    <th className="px-6 py-3 font-medium text-textSecondary uppercase tracking-wider">Team ID</th>
                                    <th className="px-6 py-3 font-medium text-textSecondary uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 font-medium text-textSecondary uppercase tracking-wider">Last Sync</th>
                                    <th className="px-6 py-3 font-medium text-textSecondary uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredTeams.length > 0 ? (
                                    filteredTeams.map((team) => (
                                        <tr key={team.id} className="hover:bg-surfaceHighlight transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-primaryLight flex items-center justify-center">
                                                        <Users className="w-5 h-5 text-primary" />
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-primary">{team.teamName}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-mono text-sm text-textSecondary">{team.teamId}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {getStatusBadge(team.status)}
                                            </td>
                                            <td className="px-6 py-4 text-textSecondary">
                                                {team.lastSync.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleSyncTeam(team.id)}
                                                        className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium"
                                                    >
                                                        Sync Now
                                                    </button>
                                                    <button className="p-1 text-textSecondary hover:text-primary">
                                                        <MoreVertical className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-textSecondary">
                                            No teams found. Connect your first team to get started.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Chats Section */}
            <div className="bg-surface rounded-lg border border-border shadow-subtle overflow-hidden">
                <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-surfaceHighlight">
                    <h2 className="font-semibold flex items-center">
                        <MessageSquare className="w-5 h-5 mr-2" />
                        Recent Chats
                    </h2>
                </div>

                {loading ? (
                    <div className="p-8 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                        <p className="mt-4 text-textSecondary">Loading chats...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-surface border-b border-border">
                                <tr>
                                    <th className="px-6 py-3 font-medium text-textSecondary uppercase tracking-wider">Participants</th>
                                    <th className="px-6 py-3 font-medium text-textSecondary uppercase tracking-wider">Last Message</th>
                                    <th className="px-6 py-3 font-medium text-textSecondary uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-3 font-medium text-textSecondary uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredChats.length > 0 ? (
                                    filteredChats.map((chat) => (
                                        <tr key={chat.id} className="hover:bg-surfaceHighlight transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    {chat.participantEmails.map((email, index) => (
                                                        <div key={index} className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                                                            <span className="text-xs font-medium text-blue-800">{email.charAt(0).toUpperCase()}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-primary">{chat.lastMessage}</div>
                                            </td>
                                            <td className="px-6 py-4 text-textSecondary">
                                                {chat.lastMessageAt.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4">
                                                <button className="p-1 text-textSecondary hover:text-primary">
                                                    <MoreVertical className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-8 text-center text-textSecondary">
                                            No recent chats found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Create Team Modal */}
            {showCreateTeamModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-surface rounded-lg border border-border shadow-xl w-full max-w-md">
                        <div className="px-6 py-4 border-b border-border flex justify-between items-center">
                            <h3 className="font-semibold text-primary">Connect Microsoft Team</h3>
                            <button
                                onClick={() => setShowCreateTeamModal(false)}
                                className="text-textSecondary hover:text-primary"
                            >
                                <span className="text-xl">&times;</span>
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-textSecondary mb-1">Team Name</label>
                                    <input
                                        type="text"
                                        value={newTeam.teamName}
                                        onChange={(e) => setNewTeam({...newTeam, teamName: e.target.value})}
                                        className="w-full px-3 py-2 bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                                        placeholder="e.g. Loan Processing Team"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-textSecondary mb-1">Team ID</label>
                                    <input
                                        type="text"
                                        value={newTeam.teamId}
                                        onChange={(e) => setNewTeam({...newTeam, teamId: e.target.value})}
                                        className="w-full px-3 py-2 bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                                        placeholder="e.g. 19:abc123..."
                                    />
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <p className="text-sm text-textSecondary">
                                        <strong>Note:</strong> To connect a team, you need to be a Team Owner. Find the Team ID in the Microsoft Teams admin center or by inspecting the team URL.
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
                            <button
                                onClick={() => setShowCreateTeamModal(false)}
                                className="px-4 py-2 text-textSecondary hover:text-primary transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateTeam}
                                disabled={!newTeam.teamName || !newTeam.teamId}
                                className={`px-4 py-2 bg-primary text-white rounded-lg hover:bg-primaryLight transition-colors ${(!newTeam.teamName || !newTeam.teamId) ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                Connect Team
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
