import { useStore } from "@nanostores/react";
import { userManager } from "@/lib/managers/userManager";

interface SettingsUser {
    username: string;
    image: string;
    admin: boolean;
    isLoading: boolean;
}

export function useSettingsUser(): SettingsUser {
    const session = useStore(userManager.sessionAtom);
    return {
        username: session?.username ?? "",
        image: session?.image ?? "",
        admin: session?.admin ?? false,
        isLoading: session == null,
    };
}
