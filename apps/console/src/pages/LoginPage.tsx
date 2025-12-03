import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "../authConfig";

export default function LoginPage() {
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { instance } = useMsal();

    const handleMicrosoftLogin = async () => {
        try {
            await instance.loginPopup(loginRequest);
            // After successful login, MSAL handles the redirect or state update
            // We can manually navigate or let the App wrapper handle auth state
            navigate('/');
        } catch (e) {
            console.error(e);
            setError('Microsoft login failed. Please try again.');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-surfaceHighlight">
            <div className="bg-surface p-8 rounded-lg shadow-md w-full max-w-md border border-border">
                <h1 className="text-2xl font-bold text-primary mb-6 text-center">Staff Console</h1>
                {error && <div className="bg-red-50 text-error p-3 rounded mb-4 text-sm">{error}</div>}
                
                <div className="space-y-4">
                    <button
                        onClick={handleMicrosoftLogin}
                        className="w-full bg-[#2F2F2F] text-white py-3 rounded font-medium hover:bg-[#1a1a1a] transition-colors flex items-center justify-center gap-2"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M10.5 0L0 0L0 10.5L10.5 10.5L10.5 0Z" fill="#F25022"/>
                            <path d="M21 0L10.5 0L10.5 10.5L21 10.5L21 0Z" fill="#7FBA00"/>
                            <path d="M10.5 10.5L0 10.5L0 21L10.5 21L10.5 10.5Z" fill="#00A4EF"/>
                            <path d="M21 10.5L10.5 10.5L10.5 21L21 21L21 10.5Z" fill="#FFB900"/>
                        </svg>
                        Sign in with Microsoft
                    </button>
                </div>

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
