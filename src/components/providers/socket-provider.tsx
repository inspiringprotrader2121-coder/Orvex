"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useSession } from "next-auth/react";
import { getErrorMessage } from "@/lib/errors";

type SocketContextType = {
    socket: Socket | null;
    isConnected: boolean;
};

const SocketContext = createContext<SocketContextType>({
    socket: null,
    isConnected: false,
});

export const useSocket = () => useContext(SocketContext);

function resolveSocketUrl() {
    if (typeof window === "undefined") {
        return process.env.NEXT_PUBLIC_SOCKET_URL || undefined;
    }

    const configuredUrl = process.env.NEXT_PUBLIC_SOCKET_URL?.trim();
    if (!configuredUrl) {
        return undefined;
    }

    try {
        const parsed = new URL(configuredUrl);
        const mixedContent = window.location.protocol === "https:" && parsed.protocol !== "https:";

        // Fall back to same-origin sockets when a public env var points to an insecure URL.
        return mixedContent ? undefined : parsed.toString();
    } catch {
        return undefined;
    }
}

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
    const socketRef = useRef<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const { data: session } = useSession();

    useEffect(() => {
        if (!session?.user?.id) {
            socketRef.current?.disconnect();
            socketRef.current = null;
            setIsConnected(false);
            return;
        }

        let cancelled = false;

        const connectSocket = async () => {
            try {
                const response = await fetch("/api/socket/token");
                if (!response.ok) {
                    throw new Error("Failed to create socket session");
                }

                const { token } = await response.json() as { token: string };
                if (cancelled) {
                    return;
                }

                const socketInstance = io(resolveSocketUrl(), {
                    auth: { token },
                    reconnectionAttempts: 5,
                });

                socketRef.current = socketInstance;

                socketInstance.on("connect", () => {
                    setIsConnected(true);
                });

                socketInstance.on("disconnect", () => {
                    setIsConnected(false);
                });
            } catch (error) {
                console.error("[Socket] Failed to initialize:", getErrorMessage(error));
                setIsConnected(false);
            }
        };

        void connectSocket();

        return () => {
            cancelled = true;
            socketRef.current?.disconnect();
            socketRef.current = null;
        };
    }, [session?.user?.id]);

    return (
        <SocketContext.Provider value={{ socket: socketRef.current, isConnected }}>
            {children}
        </SocketContext.Provider>
    );
};
