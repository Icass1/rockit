import { downloadResources } from "@/lib/downloadResources";
import { langData } from "@/stores/lang";
import { useStore } from "@nanostores/react";
import { Download } from "lucide-react";
import { useState } from "react";

export default function DownloadAppButton() {
    const [resources, setResources] = useState<string[]>([]);

    const handleClick = async () => {
        downloadResources({
            resources: [
                "/",
                "/settings",
                "/library",
                "/radio",
                "/search",
                "/friends",
                "/stats",
                "/search-icon.png",
                "/rockit-logo.ico",
                "/manifest.json",
                "/user-placeholder.png",
                "/song-placeholder.png",
                "/song-placeholder.png",
                "/youtube-music-logo.svg",
                "/rockit-background.png",
                "/screenshot-1.png",
                "/spotify-logo.png",
                "/logos/logo-192.png",
            ],
            setResources: setResources,
        });
    };

    const $lang = useStore(langData);
    if (!$lang) return;

    return (
        <div>
            <h2 className="text-xl md:text-2xl font-bold text-white mb-2">
                {$lang.download_app}
            </h2>
            <button
                onClick={handleClick}
                className="w-28 md:w-32 py-2 bg-[#1e1e1e] text-white rounded-lg shadow-md active:bg-green-700 md:hover:bg-green-700 transition duration-300 flex items-center justify-center gap-2"
            >
                <Download className="w-5 h-5" />
                {$lang.download}
            </button>

            <div className="grid grid-cols-2 gap-x-2">
                {resources.map((resource) => (
                    <span className="text-xs max-w-full min-w-0 truncate w-full">
                        {resource}
                    </span>
                ))}
            </div>
        </div>
    );
}
