import { currentSong } from "@/stores/audio";
import { useStore } from "@nanostores/react";

export default function FooterCenter() {
    const $currentSong = useStore(currentSong);

    return (
        <div className="flex items-center w-1/3 space-x-3">
            <img
                id="footer-album-cover"
                src={
                    ($currentSong?.images && $currentSong?.images[0]?.url) ||
                    "/song-placeholder.png"
                }
                alt="Album Cover"
                className="w-16 h-16 rounded-md"
            />
            <div className="flex flex-col">
                <span className="font-semibold">
                    {$currentSong?.name || "Canción desconocida :("}
                </span>
                <span className="text-sm text-gray-400 flex flex-row gap-x-1">
                    <div className="flex flex-row gap-x-1">
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
                    <span>·</span>
                    <a
                        href={`/album/${$currentSong?.albumId}`}
                        className="hover:underline"
                    >
                        {$currentSong?.albumName || "Album desconocido"}
                    </a>
                </span>
            </div>
        </div>
    );
}
