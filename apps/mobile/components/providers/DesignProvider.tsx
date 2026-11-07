import type { ReactNode } from "react";
import { useStore } from "@nanostores/react";
import {
    DarkTheme,
    DefaultTheme,
    ThemeProvider,
} from "@react-navigation/native";
import { getTheme, resolveTheme } from "@rockit/theme";
import { DesignThemeProvider } from "@rockit/ui";
import { useColorScheme } from "react-native";
import { userManager } from "@/lib/managers/userManager";

export function DesignProvider({ children }: { children: ReactNode }) {
    const session = useStore(userManager.sessionAtom);
    const system = useColorScheme();
    const mode = resolveTheme(
        session?.theme ?? "dark",
        system === "light" ? "light" : "dark"
    );
    const colors = getTheme(mode);
    const navigation = {
        ...(mode === "light" ? DefaultTheme : DarkTheme),
        colors: {
            primary: colors.primary,
            background: colors.background,
            card: colors.surface,
            text: colors.foreground,
            border: colors.border,
            notification: colors.primary,
        },
    };
    return (
        <DesignThemeProvider mode={mode}>
            <ThemeProvider value={navigation}>{children}</ThemeProvider>
        </DesignThemeProvider>
    );
}
