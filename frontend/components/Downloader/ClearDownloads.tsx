"use client";

import { useStore } from "@nanostores/react";
import { rockIt } from "@/lib/rockit/rockIt";

export default function ClearDownloads() {
    const vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);

    return (
        <button
            className="text-sm text-blue-500 md:hover:underline"
            onClick={() => {
                // Lógica para limpiar los downloads
                console.log("Clear downloads clicked");
            }}
        >
            {vocabulary.CLEAR_DOWNLOADS}
        </button>
    );
}
