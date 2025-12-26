import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle } from "lucide-react";
import { API_URL } from '../config';

export const ConnectM365Button: React.FC = () => {
    const [status, setStatus] = useState<"idle" | "loading" | "connected" | "error">("idle");

    // Check status on mount
    useEffect(() => {
        checkStatus();
    }, []);

    const checkStatus = async () => {
        try {
            const res = await fetch(`${API_URL}/m365/status`);
            const data = await res.json();
            if (data.connected) {
                setStatus("connected");
            }
        } catch (e) {
            console.error("Failed to check status", e);
        }
    };

    const handleLogin = async () => {
        setStatus("loading");
        try {
            // 1. Get Login URL from Backend
            const urlRes = await fetch(`${API_URL}/m365/auth/login_url?redirect_uri=${encodeURIComponent(window.location.origin + "/auth/callback")}`);
            const urlData = await urlRes.json();

            // 2. Redirect
            window.location.href = urlData.url;

        } catch (e: any) {
            console.error(e);
            setStatus("error");
        }
    };

    if (status === "connected") {
        return (
            <button className="px-4 py-2 bg-green-50 text-green-700 border border-green-200 rounded text-sm font-medium flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                M365 Connected
            </button>
        );
    }

    return (
        <button onClick={handleLogin} disabled={status === "loading"} className="px-4 py-2 bg-white border border-gray-200 rounded text-sm font-medium hover:bg-gray-50 flex items-center gap-2">
            {status === "loading" ? <Loader2 className="w-4 h-4 animate-spin" /> : <img src="/microsoft-logo.svg" className="w-4 h-4" alt="Microsoft" />}
            {status === "error" ? "Retry Connection" : "Connect Microsoft 365"}
        </button>
    );
};
