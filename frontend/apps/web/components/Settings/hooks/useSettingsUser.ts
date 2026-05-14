"use client";

import { rockIt } from "@/lib/rockit/rockIt";

export function useSettingsUser(): {
    username: string;
    isAuthenticated: boolean;
} {
    return {
        username: rockIt.userManager.usernameAtom.get(),
        isAuthenticated: rockIt.userManager.loggedInAtom.get(),
    };
}
