import { JSX } from "react";
import { cookies } from "next/headers";
import { SessionResponse, SessionResponseSchema } from "@/dto";
import { BACKEND_URL } from "@/environment";
import DownloaderClient from "@/components/Downloader/DownloaderClient";

async function getUserInServer(): Promise<SessionResponse | null> {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("session_id")?.value;

    const headers: Record<string, string> = {};
    if (sessionId) {
        headers.Cookie = `session_id=${sessionId}`;
    }

    const res = await fetch(`${BACKEND_URL}/user/session`, {
        headers,
    });

    if (!res.ok) return null;
    return SessionResponseSchema.parse(await res.json());
}

export default async function DownloaderPage(): Promise<JSX.Element> {
    const user = await getUserInServer();
    if (!user) return <div>Redirecting to login...</div>; // In real app, would redirect

    return <DownloaderClient />;
}
