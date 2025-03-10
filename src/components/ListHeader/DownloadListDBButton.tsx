import { downloads } from "@/stores/downloads";
import { Download } from "lucide-react";

export default function DownloadListDB({ url }: { url: string }) {
    const handleClick = () => {
        fetch(`/api/start-download?url=${url}`).then((response) => {
            response.json().then((data) => {
                downloads.set([data.download_id, ...downloads.get()]);
            });
        });
    };

    return (
        <div
            className="w-7 h-7 relative md:hover:scale-105 cursor-pointer"
            onClick={handleClick}
        >
            <div className="border-white absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 border-solid rounded-full border-[2px] w-7 h-7"></div>
            <Download
                strokeWidth={1.3}
                className="h-4 w-4 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 absolute transition-transform"
            />
        </div>
    );
}
