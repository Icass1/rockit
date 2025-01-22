import PinList from "@/components/ListHeader/PinList";
import AddToLibrary from "@/components/ListHeader/AddToLibrary";
import { Download, Heart } from "lucide-react";
import PlayList from "@/components/PlayList";
import AddToQueue from "@/components/ListHeader/AddToQueue";
import DownloadListDevice from "@/components/ListHeader/DownloadListDeviceButton";
import type { PlaylistDB, PlaylistDBSong, SongDB } from "@/lib/db";
import { langData } from "@/stores/lang";

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
    id: string;
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
              images: {
                  url: string;
              }[];
              owner: string;
          };
}) {
    const lang = langData.get();

    return (
        <div
            className={
                "flex flex-col gap-1 relative md:top-1/2 md:-translate-y-1/2 md:w-1/3 md:max-w-md h-fit md:max-h-none md:mx-4 z-10 " +
                className
            }
        >
            {/* Imagen de la playlist */}
            <div className="relative flex justify-center items-center">
                <div className="relative overflow-hidden aspect-square rounded-xl md:rounded-md h-72 md:h-[40vh] md:bg-none bg-[rgb(15,15,15)]">
                    {id === "liked" ? (
                        <div
                            className="relative rounded-md w-full h-full object-cover"
                            style={{
                                backgroundImage: "url(/rockit-background.png)",
                                backgroundSize: "cover",
                            }}
                        >
                            <Heart
                                className="w-1/2 h-1/2 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                                fill="white"
                            />
                        </div>
                    ) : (
                        <img
                            src={
                                playlist.image
                                    ? `/api/image/${playlist.image}`
                                    : playlist.images[0].url
                            }
                            className="w-full h-full object-cover"
                        />
                    )}
                </div>
            </div>

            {/* Div con los iconos */}
            <div className="flex flex-row justify-center gap-3 text-sm pt-2 items-center z-10">
                {!inDatabase && (
                    <Download strokeWidth={0.9} className="h-10 w-10" />
                )}
                <PinList type="playlist" id={id} />
                <AddToLibrary type="playlist" id={id} />
                <PlayList type="playlist" id={id} />
                <AddToQueue type="playlist" id={id} />
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
                {playlist.songs.length} {lang.songs} |{" "}
                {getMinutes(
                    songs.reduce((accumulator: number, song) => {
                        return accumulator + (song?.duration || 0);
                    }, 0)
                )}{" "}
                {lang.minutes}
            </label>
        </div>
    );
}
