"use client";

import { useCallback, useEffect, useRef, useState, type JSX } from "react";
import { PictureInPicture2 } from "lucide-react";
import { createPortal } from "react-dom";
import type { DocumentPiP } from "@/models/types/pip";
import PiPContent from "@/components/PiP/PiPRoot";

function getDocumentPiP(): DocumentPiP | null {
    if (typeof window === "undefined") return null;

    const pip = (
        window as unknown as { documentPictureInPicture?: DocumentPiP }
    ).documentPictureInPicture;

    if (pip && typeof pip.requestWindow === "function") return pip;
    return null;
}

function copyStylesToPiPWindow(pipWin: Window): void {
    const pipDoc = pipWin.document;

    [...document.styleSheets].forEach((sheet): void => {
        try {
            const styleEl = pipDoc.createElement("style");
            const rules = [...sheet.cssRules]
                .map((r): string => r.cssText)
                .join("");
            styleEl.textContent = rules;
            pipDoc.head.appendChild(styleEl);
        } catch {
            if (sheet.href) {
                const link = pipDoc.createElement("link");
                link.rel = "stylesheet";
                link.href = sheet.href;
                pipDoc.head.appendChild(link);
            }
        }
    });

    pipDoc.title = "RockIt · Miniplayer";
}

export default function PictureInPicture(): JSX.Element | null {
    const openingRef = useRef(false);
    const [pipWindow, setPipWindow] = useState<Window | null>(null);
    const [isSupported, setIsSupported] = useState<boolean | null>(null);

    useEffect((): void => {
        setIsSupported(!!getDocumentPiP());
    }, []);

    const openPiP = useCallback(async (): Promise<void> => {
        const pip = getDocumentPiP();
        if (!pip || openingRef.current) return;
        openingRef.current = true;

        try {
            const newWin = await pip.requestWindow({
                width: 320,
                height: 420,
            });

            copyStylesToPiPWindow(newWin);
            setPipWindow(newWin);
        } catch (err) {
            console.error("PiP failed to open:", err);
        } finally {
            openingRef.current = false;
        }
    }, []);

    const closePiP = useCallback((): void => {
        pipWindow?.close();
        setPipWindow(null);
    }, [pipWindow]);

    const togglePiP = useCallback((): void => {
        if (pipWindow) {
            closePiP();
        } else {
            openPiP();
        }
    }, [pipWindow, closePiP, openPiP]);

    useEffect((): (() => void) | undefined => {
        if (!pipWindow) return;
        const onClose = (): void => setPipWindow(null);
        pipWindow.addEventListener("pagehide", onClose);
        return (): void => pipWindow.removeEventListener("pagehide", onClose);
    }, [pipWindow]);

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
                    className={pipWindow ? "text-(--color-rockit-pink)" : ""}
                />
            </button>

            {pipWindow &&
                createPortal(
                    <PiPContent pipWindow={pipWindow} />,
                    pipWindow.document.body
                )}
        </>
    );
}
