import { useEffect } from "react";
import type { ThemeMode } from "@rockit/theme";

/** The installed WebKit status area follows the same palette as the app. */
export function useDocumentTheme(mode: ThemeMode, background: string): void {
    useEffect(() => {
        document.documentElement.style.backgroundColor = background;
        document.documentElement.style.colorScheme = mode;
        document.body.style.backgroundColor = background;
        const root = document.getElementById("root");
        if (root) root.style.backgroundColor = background;
        let meta = document.querySelector<HTMLMetaElement>(
            'meta[name="theme-color"]'
        );
        if (!meta) {
            meta = document.createElement("meta");
            meta.name = "theme-color";
            document.head.appendChild(meta);
        }
        meta.content = background;
    }, [mode, background]);
}
