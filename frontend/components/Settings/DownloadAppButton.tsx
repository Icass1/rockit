import { useState } from "react";
import {
    clearResources,
    downloadResources,
} from "@/lib/utils/downloadResources";
import { useLanguage } from "@/contexts/LanguageContext";
import { Download } from "lucide-react";

export default function DownloadAppButton() {
    const [resources, setResources] = useState<string[]>([]);

    const handleClick = async () => {
        await clearResources();
        console.log("Resources cleared");
        await downloadResources({
            setResources: setResources,
        });
        console.log("Resources downloaded");
    };

    const { langFile: lang } = useLanguage();
    if (!lang) return false;

    return (
        <div>
            <h2 className="mb-2 text-xl font-bold text-white md:text-2xl">
                {lang.download_app}
            </h2>
            <button
                onClick={handleClick}
                className="flex w-28 items-center justify-center gap-2 rounded-lg bg-[#1e1e1e] py-2 text-white shadow-md transition duration-300 active:bg-green-700 md:w-32 md:hover:bg-green-700"
            >
                <Download className="h-5 w-5" />
                {lang.download}
            </button>

            <div className="grid grid-cols-2 gap-x-2">
                {resources.map((resource) => (
                    <span
                        key={resource}
                        className="w-full max-w-full min-w-0 truncate text-xs"
                    >
                        {resource}
                    </span>
                ))}
            </div>
        </div>
    );
}
