import { currentSong } from "@/stores/audio";
import { useStore } from "@nanostores/react";

export default function FooterCenter() {
    const $currentSong = useStore(currentSong);

    return (
        <div className="flex items-center w-1/3 gap-x-3">
            <img
                id="footer-album-cover"
                src={
                    ($currentSong?.images && $currentSong?.images[0]?.url) ||
                    "/song-placeholder.png"
                }
                alt="Album Cover"
                className="w-16 h-16 rounded-md"
            />
            <div className="flex flex-col min-w-0 max-w-full w-full pr-4">
                <span className="font-semibold truncate hover:underline">
                    <a
                    href={`/song/${$currentSong?.id}`}
                    >
                        {$currentSong?.name || "Canción desconocida :("}
                    </a>
                </span>
                <span className="text-sm text-gray-400 flex flex-row gap-x-1">
                    <div className="flex flex-row gap-x-1 truncate">
                        {$currentSong?.artists ? (
                            $currentSong?.artists?.map((artist, index) => (
                                <a
                                    href={`/artist/${artist.id}`}
                                    className="hover:underline"
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
                    <span>•</span>
                    <a
                        href={`/album/${$currentSong?.albumId}`}
                        className="hover:underline truncate"
                    >
                        {$currentSong?.albumName || "Album desconocido"}
                    </a>
                </span>
            </div>
        </div>
    );
}