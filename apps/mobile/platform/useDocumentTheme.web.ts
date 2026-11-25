import { useEffect } from "react";
import type { ThemeMode } from "@rockit/theme";

/** Set the top browser chrome and preserve the tab bar's document underlay. */
export function useDocumentTheme(
    mode: ThemeMode,
    background: string,
    bottomBackground: string
): void {
    useEffect(() => {
        if (!document.getElementById("rockit-touch-selection")) {
            const style = document.createElement("style");
            style.id = "rockit-touch-selection";
            style.textContent = `body *:not(input):not(textarea):not([contenteditable="true"]) { -webkit-user-select:none !important; user-select:none !important; -webkit-touch-callout:none; } input,textarea,[contenteditable="true"],[contenteditable="true"] * { -webkit-user-select:text !important; user-select:text !important; -webkit-touch-callout:default; } img { -webkit-user-drag:none; }`;
            document.head.appendChild(style);
        }
        const underlay =
            background === bottomBackground
                ? "none"
                : `linear-gradient(${background} 50%, ${bottomBackground} 50%)`;
        for (const element of [document.documentElement, document.body]) {
            element.style.backgroundColor = bottomBackground;
            element.style.backgroundImage = underlay;
        }
        document.documentElement.style.colorScheme = mode;
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
    }, [mode, background, bottomBackground]);
}
