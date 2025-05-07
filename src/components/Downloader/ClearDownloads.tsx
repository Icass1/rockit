"use client";

import { langData } from "@/stores/lang";
import { useStore } from "@nanostores/react";

export default function ClearDownloads() {
    const $lang = useStore(langData);
    if (!$lang) return false;

    return (
        <button
            className="text-sm text-blue-500 md:hover:underline"
            onClick={() => {
                // Lógica para limpiar los downloads
                console.log("Clear downloads clicked");
            }}
        >
            {$lang.clear_downloads}
        </button>
    );
}
