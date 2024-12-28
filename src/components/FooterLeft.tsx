import { currentSong } from "@/stores/audio";
import { useStore } from "@nanostores/react";
import LikeButton from "./LikeButton";
import { ListPlus, EllipsisVertical } from "lucide-react";

export default function FooterCenter() {
    const $currentSong = useStore(currentSong);

    return (
        // <!-- Para el Nicolás de mañana {$currentSong && <LikeButton song={$currentSong} />} -->
        <div className="flex items-center md:w-1/3 max-w-full min-w-0 gap-x-4">
            <img
                id="footer-album-cover"
                src={
                    ($currentSong?.images && $currentSong?.images[0]?.url) ||
                    "/song-placeholder.png"
                }
                alt="Album Cover"
                className="md:w-16 md:h-16 rounded-md select-none w-9 h-9"
            />
            <div className="flex flex-col min-w-0 max-w-full w-fit">
                <span className="font-semibold flex flex-row gap-3 items-center">
                    <a
                        href={`/song/${$currentSong?.id}`}
                        className="md:hover:underline truncate"
                    >
                        {$currentSong?.name || "Canción desconocida :("}
                    </a>
                </span>
                <span className="text-sm text-gray-400 flex flex-row gap-x-1 w-full">
                    <div className="flex-0 max-w-[50%] truncate shrink-0">
                        {$currentSong?.artists ? (
                            $currentSong?.artists?.map((artist, index) => (
                                <a
                                    href={`/artist/${artist.id}`}
                                    className="md:hover:underline"
                                    key={index}
                                >
                                    {artist.name}
                                    {index < $currentSong.artists.length - 1
                                        ? ","
                                        : ""}
                                </a>
                            ))
                        ) : (
                            <div>Artista desconocido</div>
                        )}
                    </div>

                    <span className="hidden md:block select-none">•</span>

                    <a
                        href={`/album/${$currentSong?.albumId}`}
                        className="hidden md:inline-block hover:underline truncate"
                    >
                        {$currentSong?.albumName || "Album desconocido"}
                    </a>
                </span>

            </div>
            <div className="pr-4 flex-row items-left hidden md:flex">
                {$currentSong && <LikeButton song={$currentSong} />}
                <ListPlus className="ml-4 w-8 text-gray-400 md:hover:text-white md:hover:scale-105" />
                <EllipsisVertical className="ml-[0.3rem] w-[22px] h-[24px] text-gray-400 md:hover:text-white md:hover:scale-105" />
            </div>
        </div>
    );
}
