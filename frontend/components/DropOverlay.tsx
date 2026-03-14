"use client";

import { useEffect, useState } from "react";

export default function DropOverlay({
    onDropLink,
}: {
    onDropLink: (url: string) => void;
}) {
    const [show, setShow] = useState(false);

    useEffect(() => {
        const handleDragOver = (event: DragEvent) => {
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

        const handleDragLeave = () => {
            setShow(false);
        };

        const handleDrop = (event: DragEvent) => {
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

        return () => {
            window.removeEventListener("dragover", handleDragOver);
            window.removeEventListener("dragleave", handleDragLeave);
            window.removeEventListener("drop", handleDrop);
        };
    }, [onDropLink]);

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-999 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="rounded-xl border border-white/20 bg-[#1a1a1a] p-6 text-2xl text-white">
                Drop the link to import it
            </div>
        </div>
    );
}
