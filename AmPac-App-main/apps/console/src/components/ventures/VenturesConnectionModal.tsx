import { useState } from 'react';
import { Lock, X, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { venturesService } from '../../services/venturesService';

interface VenturesConnectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function VenturesConnectionModal({ isOpen, onClose, onSuccess }: VenturesConnectionModalProps) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [siteName] = useState('ampac'); // Hardcoded for Zero-Config
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await venturesService.configure(username, password, siteName);
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message || "Failed to connect. Check credentials.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <Lock className="w-4 h-4 text-blue-600" /> Connect Ventures
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="bg-red-50 text-red-700 p-3 rounded text-sm flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                            {error}
                        </div>
                    )}

                    <div className="bg-blue-50 p-4 rounded-md mb-4 text-sm text-blue-800">
                        <p className="font-medium mb-1">One-time Setup</p>
                        <p>Enter your Ventures credentials once. We'll securely store them so you don't have to log in again.</p>
                    </div>

                    {/* Hidden Site Name - Hardcoded to 'ampac' or 'test_integration' for now */}
                    <input type="hidden" value={siteName} />

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ventures Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="e.g. jdoe"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ventures Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700 disabled:opacity-50 flex justify-center items-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" /> Verifying...
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="w-4 h-4" /> Connect Integration
                                </>
                            )}
                        </button>
                    </div>

                    <p className="text-xs text-gray-500 text-center mt-4">
                        Credentials are encrypted and stored securely.
                    </p>
                </form>
            </div>
        </div>
    );
}
