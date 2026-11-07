"use client";

import { useRef, type JSX, type ReactNode } from "react";
import { useServerInsertedHTML } from "next/navigation";
import { StyleSheet } from "@rockit/ui/runtime";

/** Include universal component styles in streamed HTML before hydration. */
export function UniversalStyleRegistry({
    children,
}: {
    children: ReactNode;
}): ReactNode {
    const previous = useRef("");
    useServerInsertedHTML((): JSX.Element | null => {
        const sheet = (
            StyleSheet as typeof StyleSheet & {
                getSheet(): { id: string; textContent: string };
            }
        ).getSheet();
        if (sheet.textContent === previous.current) return null;
        previous.current = sheet.textContent;
        return (
            <style
                id={sheet.id}
                dangerouslySetInnerHTML={{ __html: sheet.textContent }}
            />
        );
    });
    return children;
}
