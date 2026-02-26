"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { PictureInPicture2 } from "lucide-react";
import PiPContent from "@/components/Footer/PictureInPicture/PipPage";

type DocumentPiP = {
    requestWindow: (opts: { width: number; height: number }) => Promise<Window>;
};

function getDocumentPiP(): DocumentPiP | null {
    if (typeof window === "undefined") return null;

    const pip = (
        window as unknown as { documentPictureInPicture?: DocumentPiP }
    ).documentPictureInPicture;

    if (pip && typeof pip.requestWindow === "function") return pip;
    return null;
}

function copyStylesToPiPWindow(pipWin: Window) {
    // Copy all stylesheets from the main document to the PiP window
    // This makes Tailwind and any other CSS available inside PiP
    [...document.styleSheets].forEach((sheet) => {
        try {
            const styleEl = document.createElement("style");
            const rules = [...sheet.cssRules].map((r) => r.cssText).join("");
            styleEl.textContent = rules;
            pipWin.document.head.appendChild(styleEl);
        } catch {
            // Cross-origin stylesheets can't be read — link them instead
            if (sheet.href) {
                const link = document.createElement("link");
                link.rel = "stylesheet";
                link.href = sheet.href;
                pipWin.document.head.appendChild(link);
            }
        }
    });
}

export default function PictureInPicture() {
    const [pipWindow, setPipWindow] = useState<Window | null>(null);
    const [isSupported, setIsSupported] = useState<boolean | null>(null);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsSupported(!!getDocumentPiP());
    }, []);

    const openPiP = useCallback(async () => {
        const pip = getDocumentPiP();
        if (!pip) return;

        try {
            const newWin = await pip.requestWindow({ width: 320, height: 400 });

            // Reset default browser styles
            Object.assign(newWin.document.body.style, {
                margin: "0",
                padding: "0",
                width: "100vw",
                height: "100vh",
                overflow: "hidden",
            });

            copyStylesToPiPWindow(newWin);
            setPipWindow(newWin);
        } catch (err) {
            console.error("PiP failed to open:", err);
        }
    }, []);

    const closePiP = useCallback(() => {
        pipWindow?.close();
        setPipWindow(null);
    }, [pipWindow]);

    const togglePiP = useCallback(() => {
        if (pipWindow) {
            closePiP();
        } else {
            openPiP();
        }
    }, [pipWindow, closePiP, openPiP]);

    // Detect when the user closes the PiP window manually
    useEffect(() => {
        if (!pipWindow) return;
        const onClose = () => setPipWindow(null);
        pipWindow.addEventListener("pagehide", onClose);
        return () => pipWindow.removeEventListener("pagehide", onClose);
    }, [pipWindow]);

    // Not supported — don't render the button at all
    if (isSupported === null || !isSupported) return null;

    return (
        <>
            <button
                onClick={togglePiP}
                className="rounded-full p-2 text-gray-400 transition hover:text-white"
                aria-label={pipWindow ? "Close miniplayer" : "Open miniplayer"}
                title={pipWindow ? "Close miniplayer" : "Open miniplayer"}
            >
                <PictureInPicture2
                    size={24}
                    className={pipWindow ? "text-[#ee1086]" : ""}
                />
            </button>

            {pipWindow && createPortal(<PiPContent />, pipWindow.document.body)}
        </>
    );
}
