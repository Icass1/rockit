"use client";

import useSession from "@/hooks/useSession";

export function useSettingsUser() {
    const session = useSession();
    return {
        username: session.user?.username ?? "",
        isLoading: session.status === "loading",
        isAuthenticated: session.status === "authenticated",
    };
}
