import { useState } from "react";
import { useStore } from "@nanostores/react";
import { Download } from "lucide-react";
import { rockIt } from "@/lib/rockit/rockIt";
import {
    clearResources,
    downloadResources,
} from "@/lib/utils/downloadResources";

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

    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);

    return (
        <div>
            <h2 className="mb-2 text-xl font-bold text-white md:text-2xl">
                {$vocabulary.DOWNLOAD_APP}
            </h2>
            <button
                onClick={handleClick}
                className="flex w-28 items-center justify-center gap-2 rounded-lg bg-[#1e1e1e] py-2 text-white shadow-md transition duration-300 active:bg-green-700 md:w-32 md:hover:bg-green-700"
            >
                <Download className="h-5 w-5" />
                {$vocabulary.DOWNLOAD_APP}
            </button>

            <div className="grid grid-cols-2 gap-x-2">
                {resources.map((resource) => (
                    <span
                        key={resource}
                        className="w-full min-w-0 max-w-full truncate text-xs"
                    >
                        {resource}
                    </span>
                ))}
            </div>
        </div>
    );
}
