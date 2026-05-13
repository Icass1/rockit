"use client";

import { rockIt } from "@/lib/rockit/rockIt";

export function useSettingsUser() {
    return {
        username: rockIt.userManager.usernameAtom.get(),
        isAuthenticated: rockIt.userManager.loggedInAtom.get(),
    };
}
