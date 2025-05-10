"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { PictureInPicture2, Play, Pause } from "lucide-react";
import { useStore } from "@nanostores/react";
import { currentSong, playing, play, pause } from "@/stores/audio";

export default function MiniplayerPiP() {
  const $currentSong = useStore(currentSong);
  const $playing     = useStore(playing);
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
        const newWin = await docPiP.requestWindow({ width: 320, height: 240 });
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

  // Contenido que irá dentro de la ventana PiP
  const PiPContents = (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "radial-gradient(circle,#111,#000)",
        color: "white",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        boxSizing: "border-box",
        fontFamily: "sans-serif",
      }}
    >
      {/* Cover */}
      {$currentSong?.image && (
        <img
          src={`/api/image/${$currentSong.image}`}
          alt="Cover"
          style={{
            width: "60%",
            borderRadius: "0.5rem",
            boxShadow: "0 0 10px rgba(0,0,0,0.5)",
          }}
        />
      )}

      {/* Título y artista */}
      <h2 style={{ margin: "0.5rem 0 0.25rem", fontSize: "1.2rem" }}>
        {$currentSong?.name}
      </h2>
      <p style={{ margin: 0, fontSize: "0.9rem", opacity: 0.75, textAlign: "center" }}>
        {$currentSong?.artists.map((a) => a.name).join(", ")}
      </p>

      {/* Controles */}
      <button
        onClick={() => ($playing ? pause() : play())}
        style={{
          marginTop: "1rem",
          background: "transparent",
          border: "none",
          cursor: "pointer",
        }}
        aria-label={$playing ? "Pause" : "Play"}
      >
        {$playing ? (
          <Pause size={32} color="white" />
        ) : (
          <Play size={32} color="white" />
        )}
      </button>
    </div>
  );

  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={togglePiP}
        className="p-2 rounded-full text-gray-400 hover:text-white transition"
        aria-label={pipWindow ? "Cerrar Miniplayer" : "Abrir Miniplayer"}
      >
        <PictureInPicture2 size={24} />
      </button>

      {/* Si la ventana está abierta, hacemos portal de los contenidos */}
      {pipWindow && createPortal(PiPContents, pipWindow.document.body)}
    </div>
  );
}