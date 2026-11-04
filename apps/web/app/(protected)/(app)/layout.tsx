import type { JSX, ReactNode } from "react";
import { getUserInServer } from "@/lib/getUserInServer";
import { getInitialQueue } from "@/lib/server/playback";
import AppClientLayout from "@/components/Layout/AppClientLayout";

export default async function AppLayout({
    children,
}: {
    children: ReactNode;
}): Promise<JSX.Element> {
    const user = await getUserInServer();
    const queue =
        user && user !== "offline" ? await getInitialQueue() : undefined;
    return (
        <AppClientLayout
            session={user && user !== "offline" ? user : undefined}
            queue={queue}
        >
            {children}
        </AppClientLayout>
    );
}
