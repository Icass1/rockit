"use client";

import { useEffect, useState, type JSX } from "react";
import { createPortal } from "react-dom";
import { droppedUrl, isLinkDrag } from "@/lib/utils/droppedUrl";
import { useVocabulary } from "@/components/providers/VocabularyProvider";

export default function DropOverlay({
    onDropLink,
    label,
    enabled = true,
}: {
    onDropLink: (url: string) => void;
    label?: string;
    enabled?: boolean;
}): JSX.Element | null {
    const vocabulary = useVocabulary();

    const [show, setShow] = useState(false);

    useEffect((): (() => void) | undefined => {
        if (!enabled) return;
        const handleDragOver = (event: DragEvent): void => {
            if (!isLinkDrag(Array.from(event.dataTransfer?.types ?? [])))
                return;
            event.preventDefault();
            if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
            setShow(true);
        };
        const hide = (): void => setShow(false);
        const handleDragLeave = (event: DragEvent): void => {
            if (
                !event.relatedTarget &&
                (event.clientX <= 0 ||
                    event.clientY <= 0 ||
                    event.clientX >= window.innerWidth ||
                    event.clientY >= window.innerHeight)
            )
                hide();
        };
        const handleDrop = (event: DragEvent): void => {
            hide();
            if (!isLinkDrag(Array.from(event.dataTransfer?.types ?? [])))
                return;
            event.preventDefault();
            const url = droppedUrl(
                event.dataTransfer?.getData("text/uri-list") ?? "",
                event.dataTransfer?.getData("text/plain") ?? ""
            );
            if (url) onDropLink(url);
        };
        window.addEventListener("dragover", handleDragOver);
        window.addEventListener("dragleave", handleDragLeave);
        window.addEventListener("drop", handleDrop);
        window.addEventListener("dragend", hide);
        window.addEventListener("blur", hide);
        return (): void => {
            window.removeEventListener("dragover", handleDragOver);
            window.removeEventListener("dragleave", handleDragLeave);
            window.removeEventListener("drop", handleDrop);
            window.removeEventListener("dragend", hide);
            window.removeEventListener("blur", hide);
        };
    }, [onDropLink, enabled]);

    if (!show || !enabled || typeof document === "undefined") return null;

    return createPortal(
        <div className="bg-backdrop/70 pointer-events-none fixed inset-0 z-999 flex items-center justify-center">
            <div
                role="status"
                className="border-border bg-secondary text-foreground-strong rounded-md border p-6 text-2xl shadow-xl"
            >
                {label ?? vocabulary.ADD_MEDIA_TO_PLAYLIST}
            </div>
        </div>,
        document.body
    );
}
