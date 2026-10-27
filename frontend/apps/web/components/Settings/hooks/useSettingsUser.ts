"use client";

import { useStore } from "@nanostores/react";
import { rockIt } from "@/lib/rockit/rockIt";

export function useSettingsUser(): {
    username: string;
    isAuthenticated: boolean;
    image: string;
} {
    return {
        username: useStore(rockIt.userManager.usernameAtom),
        isAuthenticated: useStore(rockIt.userManager.loggedInAtom),
        image: useStore(rockIt.userManager.imageAtom),
    };
}
