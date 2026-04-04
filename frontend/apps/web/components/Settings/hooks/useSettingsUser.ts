"use client";

import { rockIt } from "@/lib/rockit/rockIt";

export function useSettingsUser() {
    return {
        username: rockIt.userManager.user?.username ?? "",
        isAuthenticated: !!rockIt.userManager.user,
    };
}
