import { useEffect } from "react";
import type { ThemeMode } from "@rockit/theme";

/** WebKit paints outside the CSS viewport from the document, not the tab bar. */
export function useDocumentTheme(
    mode: ThemeMode,
    background: string,
    bottomBackground: string
): void {
    useEffect(() => {
        document.documentElement.style.backgroundColor = bottomBackground;
        document.documentElement.style.colorScheme = mode;
        document.body.style.backgroundColor = bottomBackground;
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
        meta.content = bottomBackground;
    }, [mode, background, bottomBackground]);
}
