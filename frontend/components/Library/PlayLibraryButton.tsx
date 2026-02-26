import { useStore } from "@nanostores/react";
import { Pause, Play } from "lucide-react";
import { rockIt } from "@/lib/rockit/rockIt";

export default function PlayLibraryButton() {
    let icon;

    const $queue = useStore(rockIt.queueManager.queueAtom);
    const $currentQueueSongId = useStore(
        rockIt.queueManager.currentQueueSongIdAtom
    );

    const playingLibrary = $queue?.find(
        (queueSong) =>
            queueSong.queueSongId == $currentQueueSongId &&
            queueSong?.list?.type == "library"
    )
        ? true
        : false;

    const $playing = useStore(rockIt.audioManager.playingAtom);

    if (playingLibrary && $playing) {
        icon = (
            <Pause
                className="relative top-1/2 left-1/2 h-1/2 w-1/2 -translate-x-1/2 -translate-y-1/2"
                fill="white"
            />
        );
    } else {
        icon = (
            <Play
                className="relative top-1/2 left-1/2 h-1/2 w-1/2 -translate-x-1/2 -translate-y-1/2"
                fill="white"
            />
        );
    }

    // const playLibraryHandler = async () => {
    //     const albums = libraryLists
    //         .get()
    //         .filter((list) => list.type === "album");

    //     const librarySongs: SongDB<
    //         | "id"
    //         | "path"
    //         | "name"
    //         | "image"
    //         | "artists"
    //         | "albumName"
    //         | "albumId"
    //         | "duration"
    //     >[] = [];

    //     await Promise.all(
    //         albums.map(async (album) => {
    //             const response = await fetch(`/api/album/${album.id}?p=songs`);
    //             const json = await response.json();
    //             const albumsSongs = json.songs;
    //             librarySongs.push(...albumsSongs);
    //         })
    //     );

    //     let songsToAdd = librarySongs
    //         .filter((song) => song?.path)
    //         .map((song, index) => {
    //             return {
    //                 song: song,
    //                 list: { type: "library", id: "" },
    //                 index: index,
    //             };
    //         });

    //     if (songsToAdd.length == 0) {
    //         console.warn("No songs to play in this list");
    //         return;
    //     }

    //     if (!window.navigator.onLine) {
    //         songsToAdd = songsToAdd.filter((song) =>
    //             songsInIndexedDB.get()?.includes(song.song.id)
    //         );
    //     }

    //     if (randomQueue.get()) {
    //         const shuffled = [...songsToAdd].sort(() => Math.random() - 0.5);
    //         playWhenReady.set(true);

    //         currentSong.set(shuffled[0].song);
    //         queueIndex.set(shuffled[0].index);
    //         queue.set(shuffled);
    //     } else {
    //         playWhenReady.set(true);

    //         currentSong.set(songsToAdd[0].song);
    //         queueIndex.set(0);
    //         queue.set(songsToAdd);
    //     }
    // };

    return (
        <>
            <div
                onClick={() => {
                    if (playingLibrary && $playing) {
                        rockIt.audioManager.play();
                    } else if (playingLibrary) {
                        rockIt.audioManager.pause();
                    } else {
                        console.warn("PlayLibraryButton playLibraryHandler");
                    }
                }}
                title="Play albums in library"
                className="h-8 w-8 cursor-pointer rounded-full bg-gradient-to-r from-[#ee1086] to-[#fb6467] shadow-[0px_0px_20px_3px_#0e0e0e] transition-transform md:h-16 md:w-16 md:hover:scale-105"
            >
                {icon}
            </div>
        </>
    );
}
