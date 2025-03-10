import AddToLibrary from "@/components/ListHeader/AddToLibrary";
import DownloadListDevice from "@/components/ListHeader/DownloadListDeviceButton";
import ListOptions from "@/components/ListHeader/ListOptions";
import PinList from "@/components/ListHeader/PinList";
import PlayList from "@/components/PlayList";
import type { PlaylistDB, PlaylistDBSong } from "@/lib/db/playlist";
import type { SongDB } from "@/lib/db/song";
import { getImageUrl } from "@/lib/getImageUrl";
import { langData } from "@/stores/lang";
import { useStore } from "@nanostores/react";
import { Disc3, Download, Heart, History } from "lucide-react";

function getMinutes(seconds: number) {
    seconds = Math.round(seconds);

    if (typeof seconds !== "number" || isNaN(seconds)) {
        return "Invalid input";
    }

    // Calculate minutes and remaining seconds
    const minutes = Math.floor(seconds / 60);

    // Format the result with leading zeros
    const formattedMinutes = String(minutes).padStart(2, "0");

    return `${formattedMinutes}`;
}

export default function PlaylistHeader({
    inDatabase,
    id,
    songs,
    className,
    playlist,
}: {
    inDatabase: boolean;
    id: string | "liked" | "most-listened" | "recent-mix";
    songs: SongDB<
        | "id"
        | "images"
        | "image"
        | "name"
        | "albumId"
        | "duration"
        | "artists"
        | "path"
        | "albumName"
    >[];
    className: string;
    playlist:
        | PlaylistDB
        | {
              name: string;
              songs: PlaylistDBSong[];
              image: string;
              images:
                  | {
                        url: string;
                    }[]
                  | undefined;
              owner: string;
          };
}) {
    const $lang = useStore(langData);
    if (!$lang) return;

    let coverIcon;

    if (id == "liked") {
        coverIcon = (
            <Heart
                className="w-1/2 h-1/2 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                fill="white"
            />
        );
    } else if (id == "most-listened") {
        coverIcon = (
            <Disc3 className="w-1/2 h-1/2 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
        );
    } else if (id == "recent-mix") {
        coverIcon = (
            <History className="w-1/2 h-1/2 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
        );
    }
    const specialPlaylist = ["liked", "most-listened", "recent-mix"].includes(
        id
    );

    return (
        <div
            className={
                "md:top-1/2 md:-translate-y-1/2 md:w-full md:max-w-96 px-10 md:px-0 flex flex-col gap-1 relative h-[26rem] md:max-h-none md:h-fit " +
                className
            }
        >
            {/* Imagen de la playlist */}
            <div className="relative flex justify-center items-center h-full min-h-0 max-h-full md:h-auto">
                <div className="relative overflow-hidden aspect-square rounded-xl md:rounded-md md:w-full md:h-auto h-full w-auto md:bg-none bg-[rgb(15,15,15)]">
                    {specialPlaylist ? (
                        <div
                            className="relative rounded-md w-full h-full object-cover"
                            style={{
                                backgroundImage: "url(/rockit-background.png)",
                                backgroundSize: "cover",
                            }}
                        >
                            {coverIcon}
                        </div>
                    ) : (
                        <img
                            src={getImageUrl({
                                imageId: playlist.image,
                                fallback:
                                    playlist?.images?.[0]?.url ??
                                    "/rockit-background.png",
                                height: 370,
                                width: 370,
                            })}
                            className="w-full h-full object-cover"
                        />
                    )}
                </div>
            </div>

            {/* Div con los iconos */}
            <div className="flex flex-row justify-center gap-3 text-sm pt-2 items-center">
                {!inDatabase && (
                    <Download strokeWidth={0.9} className="h-10 w-10" />
                )}
                {!specialPlaylist && <PinList type="playlist" id={id} />}
                {!specialPlaylist && <AddToLibrary type="playlist" id={id} />}
                <PlayList type="playlist" id={id} />
                <ListOptions type="playlist" id={id} />
                <DownloadListDevice type="playlist" id={id} />
            </div>

            {/* Nombre de la playlist */}
            <label className="text-2xl font-semibold text-center text-balance">
                {playlist.name}
            </label>

            {/* Propietario */}
            <label className="text-xl font-semibold text-stone-400 flex flex-wrap justify-center">
                {playlist.owner}
            </label>

            {/* Información adicional */}
            <label className="text-sm text-stone-400 text-center">
                {playlist.songs.length} {$lang.songs} |{" "}
                {getMinutes(
                    songs.reduce((accumulator: number, song) => {
                        return accumulator + (song?.duration || 0);
                    }, 0)
                )}{" "}
                {$lang.minutes}
            </label>
        </div>
    );
}
