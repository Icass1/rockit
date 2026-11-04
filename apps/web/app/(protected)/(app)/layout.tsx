import type { JSX, ReactNode } from "react";
import { getUserInServer } from "@/lib/getUserInServer";
import AppClientLayout from "@/components/Layout/AppClientLayout";

export default async function AppLayout({
    children,
}: {
    children: ReactNode;
}): Promise<JSX.Element> {
    const user = await getUserInServer();
    return (
        <AppClientLayout
            session={user && user !== "offline" ? user : undefined}
        >
            {children}
        </AppClientLayout>
    );
}
