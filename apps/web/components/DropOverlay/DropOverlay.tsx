"use client";

import { useEffect, useState, type JSX } from "react";

export default function DropOverlay({
    onDropLink,
}: {
    onDropLink: (url: string) => void;
}): JSX.Element | null {
    const [show, setShow] = useState(false);

    useEffect((): (() => void) => {
        const handleDragOver = (event: DragEvent): void => {
            console.log("Drag over detected");
            event.preventDefault();

            // Show popup ONLY if dragging a link
            const isLink =
                Array.from(event.dataTransfer?.types || []).includes(
                    "text/uri-list"
                ) ||
                Array.from(event.dataTransfer?.types || []).includes(
                    "text/plain"
                );

            if (isLink) setShow(true);
        };

        const handleDragLeave = (): void => {
            console.log("Drag leave detected");
            setShow(false);
        };

        const handleDrop = (event: DragEvent): void => {
            console.log("Drop detected");
            event.preventDefault();
            setShow(false);

            const url =
                event.dataTransfer?.getData("text/uri-list") ||
                event.dataTransfer?.getData("text/plain");

            if (url) onDropLink(url);
        };

        window.addEventListener("dragover", handleDragOver);
        window.addEventListener("dragleave", handleDragLeave);
        window.addEventListener("drop", handleDrop);

        return (): void => {
            window.removeEventListener("dragover", handleDragOver);
            window.removeEventListener("dragleave", handleDragLeave);
            window.removeEventListener("drop", handleDrop);
        };
    }, [onDropLink]);

    if (!show) return null;

    return (
        <div className="bg-backdrop/70 fixed inset-0 z-999 flex items-center justify-center backdrop-blur-sm">
            <div className="border-foreground-strong/20 bg-secondary text-foreground-strong rounded-xl border p-6 text-2xl">
                Drop the link to import it
            </div>
        </div>
    );
}
