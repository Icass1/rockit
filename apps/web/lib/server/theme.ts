import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import type { ThemePreference } from "@/dto";
import { getUserInServer } from "@/lib/getUserInServer";
import { parseTheme, THEME_COOKIE } from "@/lib/theme";

export const getRequestTheme = cache(async (): Promise<ThemePreference> => {
    const store = await cookies();
    if (store.has("session_id")) {
        const user = await getUserInServer();
        if (user && user !== "offline") return parseTheme(user.theme);
    }
    return parseTheme(store.get(THEME_COOKIE)?.value);
});
