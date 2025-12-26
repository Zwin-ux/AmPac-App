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

            // Send the access token to the backend to establish the session
            // Note: For full offline access, we might need the authorization code flow (Hybrid)
            // or use the OBO flow if we have a middle tier.
            // For now, let's send the access token we got.

            // Ideally, we should use the code flow for the backend to get refresh tokens.
            // But since we are using MSAL.js (SPA), we get tokens directly.
            // To support the "Zero-Config" goal where the backend can act offline, 
            // we need to ensure the backend has a refresh token.

            // Strategy:
            // 1. Login on Client (get Access Token for Client use)
            // 2. Call Backend /auth/exchange with the *Access Token*? No, it expects code.

            // Let's stick to the "Connect" flow for the backend for now, 
            // OR we can try to get an authorization code silently.

            // For this "Phase 1", we will just ensure the user is logged in to the Console.
            // The "Connect M365" button inside the app will still be needed for the *Backend* connection
            // until we implement the advanced Hybrid flow.

            // However, to reduce friction, we can auto-trigger the backend connection check.

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
                            <path d="M10.5 0L0 0L0 10.5L10.5 10.5L10.5 0Z" fill="#F25022" />
                            <path d="M21 0L10.5 0L10.5 10.5L21 10.5L21 0Z" fill="#7FBA00" />
                            <path d="M10.5 10.5L0 10.5L0 21L10.5 21L10.5 10.5Z" fill="#00A4EF" />
                            <path d="M21 10.5L10.5 10.5L10.5 21L21 21L21 10.5Z" fill="#FFB900" />
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
