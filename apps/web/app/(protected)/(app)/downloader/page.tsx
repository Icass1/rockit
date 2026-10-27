import { JSX } from "react";
import { type SessionResponse } from "@/dto";
import { Http } from "@/lib/http";
import DownloaderClient from "@/components/Downloader/DownloaderClient";

async function getUserInServer(): Promise<SessionResponse | null> {
    const session = await Http.getSession();
    if (!session.isOk()) return null;
    return session.result;
}

export default async function DownloaderPage(): Promise<JSX.Element> {
    const user = await getUserInServer();
    if (!user) return <div>Redirecting to login...</div>; // In real app, would redirect

    return <DownloaderClient />;
}
