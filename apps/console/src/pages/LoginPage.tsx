import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { app } from '../firebaseConfig';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const auth = getAuth(app);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await signInWithEmailAndPassword(auth, email, password);
            navigate('/');
        } catch (err: any) {
            setError('Invalid email or password');
            console.error(err);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-surfaceHighlight">
            <div className="bg-surface p-8 rounded-lg shadow-md w-full max-w-md border border-border">
                <h1 className="text-2xl font-bold text-primary mb-6 text-center">Staff Console</h1>
                {error && <div className="bg-red-50 text-error p-3 rounded mb-4 text-sm">{error}</div>}
                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-textSecondary mb-1">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full p-2 border border-border rounded focus:ring-2 focus:ring-primary outline-none"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-textSecondary mb-1">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-2 border border-border rounded focus:ring-2 focus:ring-primary outline-none"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-primary text-white py-2 rounded font-medium hover:bg-primaryLight transition-colors"
                    >
                        Sign In
                    </button>
                </form>

                <div className="mt-6 pt-6 border-t border-border">
                    <button
                        onClick={() => {
                            localStorage.setItem('ampac_dev_bypass', 'true');
                            navigate('/');
                        }}
                        className="w-full bg-gray-100 text-textSecondary py-2 rounded font-medium hover:bg-gray-200 transition-colors text-sm"
                    >
                        Dev Bypass (Skip Login)
                    </button>
                </div>
            </div>
        </div>
    );
}
