"use client";

import { useSession } from "@/components/providers/SessionProvider";

export function useSettingsUser(): {
    username: string;
    isAuthenticated: boolean;
    image: string;
} {
    const session = useSession();
    return {
        username: session?.username ?? "",
        isAuthenticated: !!session,
        image: session?.image ?? "",
    };
}
