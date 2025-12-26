import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from "lucide-react";
import { API_URL } from '../config';

export const AuthCallbackPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState("Processing login...");

    useEffect(() => {
        const code = searchParams.get("code");
        if (code) {
            exchangeCode(code);
        } else {
            setStatus("No code found. Redirecting...");
            setTimeout(() => navigate("/"), 2000);
        }
    }, [searchParams]);

    const exchangeCode = async (code: string) => {
        try {
            const res = await fetch(`${API_URL}/m365/auth/exchange`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    code,
                    redirect_uri: window.location.origin + "/auth/callback"
                })
            });

            if (res.ok) {
                setStatus("Success! Redirecting...");
                setTimeout(() => navigate("/"), 1000);
            } else {
                setStatus("Failed to exchange token.");
            }
        } catch (e) {
            console.error(e);
            setStatus("Error during login.");
        }
    };

    return (
        <div className="flex h-screen w-full items-center justify-center flex-col gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">{status}</p>
        </div>
    );
};
