// @vitest-environment jsdom
import { getTheme } from "@rockit/theme";
import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { useDocumentTheme } from "../../../apps/mobile/platform/useDocumentTheme.web";

afterEach(cleanup);
it("matches the top chrome to the header and the bottom underlay to the footer in both themes", () => {
    const root = document.createElement("div");
    root.id = "root";
    document.body.appendChild(root);
    const dark = getTheme("dark"),
        light = getTheme("light");
    const view = renderHook(
        ({ mode, background, bottom }) =>
            useDocumentTheme(mode, background, bottom),
        {
            initialProps: {
                mode: "dark" as "dark" | "light",
                background: dark.background,
                bottom: dark.secondary,
            },
        }
    );
    const rgb = (color: string) => {
        const element = document.createElement("div");
        element.style.color = color;
        return element.style.color;
    };
    expect(document.body.style.backgroundColor).toBe(rgb(dark.secondary));
    expect(document.documentElement.style.backgroundColor).toBe(
        rgb(dark.secondary)
    );
    expect(root.style.backgroundColor).toBe(rgb(dark.background));
    const gradient = (top: string, footer: string) => {
        const element = document.createElement("div");
        element.style.backgroundImage = `linear-gradient(${top} 50%, ${footer} 50%)`;
        return element.style.backgroundImage;
    };
    expect(document.body.style.backgroundImage).toBe(
        gradient(dark.background, dark.secondary)
    );
    expect(document.documentElement.style.backgroundImage).toBe(
        gradient(dark.background, dark.secondary)
    );
    expect(
        document
            .querySelector('meta[name="theme-color"]')
            ?.getAttribute("content")
    ).toBe(dark.background);
    view.rerender({
        mode: "light",
        background: light.background,
        bottom: light.secondary,
    });
    expect(document.body.style.backgroundColor).toBe(rgb(light.secondary));
    expect(document.body.style.backgroundImage).toBe(
        gradient(light.background, light.secondary)
    );
    expect(root.style.backgroundColor).toBe(rgb(light.background));
    expect(document.documentElement.style.colorScheme).toBe("light");
    view.rerender({
        mode: "dark",
        background: dark.background,
        bottom: dark.background,
    });
    expect(document.body.style.backgroundColor).toBe(rgb(dark.background));
    expect(document.body.style.backgroundImage).toBe("none");
    root.remove();
});
