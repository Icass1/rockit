"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { PictureInPicture2 } from "lucide-react";
import PiPContent from "./PipPage";

export default function MiniplayerPiP() {
    const [pipWindow, setPiPWindow] = useState<Window | null>(null);

    // Alterna la ventana PiP
    const togglePiP = useCallback(async () => {
        // Detección robusta de la API
        const docPiP =
            (document as any).pictureInPicture ??
            (window as any).documentPictureInPicture;

        if (!docPiP || typeof docPiP.requestWindow !== "function") {
            console.warn("Document PiP no soportado, usando canvas hack…");
            // Aquí podrías llamar a tu fallback de canvas si lo tienes
            return;
        }

        if (pipWindow) {
            pipWindow.close();
            setPiPWindow(null);
        } else {
            try {
                const newWin = await docPiP.requestWindow({
                    width: 320,
                    height: 380,
                });
                Object.assign(newWin.document.body.style, {
                    margin: "0", // elimina márgenes por defecto
                    width: "100vw", // ocupa todo el viewport
                    height: "100vh",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    boxSizing: "border-box",
                    fontFamily: "sans-serif",
                    backgroundImage:
                        "linear-gradient(to bottom, #202124, #121212)",
                    overflow: "hidden",
                    position: "relative",
                });
                setPiPWindow(newWin);
            } catch (err) {
                console.error("Error al abrir PiP:", err);
            }
        }
    }, [pipWindow]);

    // Detectar cierre de la ventana PiP
    useEffect(() => {
        const onClose = () => setPiPWindow(null);
        pipWindow?.addEventListener("pagehide", onClose);
        return () => pipWindow?.removeEventListener("pagehide", onClose);
    }, [pipWindow]);

    return (
        <div className="flex items-center space-x-2">
            <button
                onClick={togglePiP}
                className="rounded-full p-2 text-gray-400 transition hover:text-white"
                aria-label={
                    pipWindow ? "Cerrar Miniplayer" : "Abrir Miniplayer"
                }
            >
                <PictureInPicture2 size={24} />
            </button>

            {/* Si la ventana está abierta, hacemos portal de los contenidos */}
            {pipWindow && createPortal(<PiPContent />, pipWindow.document.body)}
        </div>
    );
}
