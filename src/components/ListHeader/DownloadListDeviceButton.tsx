import { downloadResources } from "@/lib/downloadResources";
import { database, saveSongToIndexedDB } from "@/stores/audio";
import { currentListSongs } from "@/stores/currentList";
import { ArrowDown } from "lucide-react";

export default function DownloadListDevice({
    type,
    id,
    image,
}: {
    type: string;
    id: string;
    image?: string;
}) {
    const handleClick = async () => {
        downloadResources({ resources: [`/${type}/${id}`] });

        currentListSongs.get().map((song) => {
            saveSongToIndexedDB(song);
        });

        if (!database) return;

        const imageBlob = await fetch(`/api/image/${image}`).then((response) =>
            response.blob()
        );

        const imageToSave = {
            id: image,
            blob: imageBlob,
        };

        const imagesTx = database.transaction("images", "readwrite");
        const imagesStore = imagesTx.objectStore("images");
        imagesStore.put(imageToSave);
    };

    return (
        <div className="relative">
            <div
                className="w-7 h-7 relative cursor-pointer whitespace-nowrap md:hover:scale-105"
                onClick={handleClick}
            >
                <div className="border-white absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 border-solid rounded-full border-[2px] w-7 h-7"></div>
                <ArrowDown
                    strokeWidth={1.3}
                    className="h-5 w-5 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 absolute transition-transform"
                />
            </div>
        </div>
    );
}
