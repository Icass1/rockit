"use client";

import { useState } from "react";
import Image from "next/image";
import { rockIt } from "@/lib/rockit/rockIt";
import { SongWithAlbum } from "@/lib/rockit/songWithAlbum";
import { useStore } from "@nanostores/react";
import { Download, Pause, Play } from "lucide-react";

function SongPageCoverIcon({
    song,
    hover,
}: {
    song: SongWithAlbum;
    hover: boolean;
}) {
    const $currentSong = useStore(rockIt.queueManager.currentSongAtom);
    const $playing = useStore(rockIt.audioManager.playingAtom);

    const iconClassName =
        "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-all z-20" +
        (hover ? " w-20 h-20 " : " w-0 h-0 ");

    if (!song.downloaded) {
        return (
            <Download
                className={iconClassName}
                onClick={() =>
                    rockIt.downloaderManager.downloadSpotifySongToDBAsync(
                        song.publicId
                    )
                }
            />
        );
    }

    if ($currentSong?.publicId == song.publicId && $playing) {
        return <Pause className={iconClassName} fill="white" />;
    } else {
        return <Play className={iconClassName} fill="white" />;
    }
}

export default function SongPageCover({ song }: { song: SongWithAlbum }) {
    const [hover, setHover] = useState(false);

    // const handleClick = () => {
    //     if (song.path == undefined || song.path == "") {
    //         fetch(
    //             `/api/start-download?url=https://open.spotify.com/track/${song.id}`
    //         ).then((response) => {
    //             response.json().then((data) => {
    //                 downloads.set([data.download_id, ...downloads.get()]);
    //             });
    //         });
    //         return;
    //     }

    //     if (!song.path) {
    //         return;
    //     }

    //     if ($currentSong?.id == song.id && $playing) {
    //         rockIt.audioManager.pause();
    //     } else if ($currentSong?.id == song.id) {
    //         rockIt.audioManager.play();
    //     } else {
    //         playWhenReady.set(true);
    //         currentSong.set(song);

    //         queueIndex.set(0);
    //         queue.set([{ song: song, list: undefined, index: 0 }]);
    //     }
    // };

    return (
        <div className="relative h-full w-full max-w-md">
            <div
                className="relative aspect-square h-auto w-full max-w-md cursor-pointer overflow-hidden rounded-lg object-cover select-none"
                onMouseEnter={() => setHover(true)}
                onMouseLeave={() => setHover(false)}
                onClick={() => console.log("(SongPageCover) handleClick")}
            >
                <Image
                    src={
                        song.album.internalImageUrl ??
                        rockIt.SONG_PLACEHOLDER_IMAGE_URL
                    }
                    width={600}
                    height={600}
                    alt="Carátula de la canción"
                    className={
                        "absolute z-10 h-full w-full transition-all " +
                        (hover ? "brightness-[60%]" : "")
                    }
                />

                <SongPageCoverIcon song={song} hover={hover} />
            </div>
        </div>
    );
}
