import { currentSong } from "@/stores/audio";
import { useStore } from "@nanostores/react";

export default function FooterCenter() {
    const $currentSong = useStore(currentSong);

    return (
        // <!-- Para el Nicolás de mañana {$currentSong && <LikeButton song={$currentSong} />} -->
        <div className="flex items-center md:w-1/3 w-[90%] gap-x-3">
            <img
                id="footer-album-cover"
                src={
                    ($currentSong?.images && $currentSong?.images[0]?.url) ||
                    "/song-placeholder.png"
                }
                alt="Album Cover"
                className="md:w-16 md:h-16 rounded-md select-none w-9 h-9"
            />
            <div className="flex flex-col min-w-0 max-w-full w-full pr-4">
                <span className="font-semibold truncate  flex flex-row gap-3 items-center">
                    <a
                        href={`/song/${$currentSong?.id}`}
                        className="md:hover:underline"
                    >
                        {$currentSong?.name || "Canción desconocida :("}
                    </a>
                </span>
                <span className="text-sm text-gray-400 flex flex-row gap-x-1">
                    <div className="flex flex-row gap-x-1 w-full md:w-fit truncate">
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
                        className="hidden md:block hover:underline truncate"
                    >
                        {$currentSong?.albumName || "Album desconocido"}
                    </a>
                </span>
            </div>
        </div>
    );
}
