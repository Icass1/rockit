"use client";

import type { JSX } from "react";
import Image from "next/image";
import { useStore } from "@nanostores/react";
import { AnimatePresence, motion } from "framer-motion";
import type { BaseSongWithAlbumResponse } from "@/dto";
import { isSongWithAlbum } from "@/models/types/media";
import { rockIt } from "@/lib/rockit/rockIt";
import PlayButton from "@/components/Home/PlayButton";

interface DockedItem {
    song: BaseSongWithAlbumResponse;
    queue: BaseSongWithAlbumResponse[];
    label: string;
}

interface DockedQuickAccessBarProps {
    visible: boolean;
    items: DockedItem[];
}

export default function DockedQuickAccessBar({
    visible,
    items,
}: DockedQuickAccessBarProps): JSX.Element {
    const $currentMedia = useStore(rockIt.queueManager.currentMediaAtom);
    const $playing = useStore(rockIt.mediaPlayerManager.playingAtom);
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);

    function handleClick(song: BaseSongWithAlbumResponse, queue: BaseSongWithAlbumResponse[]): void {
        const playableSongs = queue.filter(isSongWithAlbum);
        if (playableSongs.length > 0) {
            rockIt.queueManager.setMedia(playableSongs, "home");
            rockIt.queueManager.moveToMedia(song.publicId);
            rockIt.mediaPlayerManager.play();
        }
    }

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ y: -64, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -64, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="fixed inset-x-0 top-0 z-40 flex justify-center px-4 pt-3"
                >
                    <div className="flex items-center gap-2 rounded-full bg-black/70 px-3 py-2 shadow-lg backdrop-blur-md">
                        {items.map(({ song, queue, label }) => {
                            const isThisPlaying =
                                $currentMedia?.publicId === song.publicId &&
                                $playing;

                            return (
                                <button
                                    key={song.publicId}
                                    type="button"
                                    aria-label={label}
                                    onClick={() => handleClick(song, queue)}
                                    className="group flex items-center gap-2 rounded-full py-1 pl-1 pr-3 transition hover:bg-white/10"
                                >
                                    <Image
                                        src={song.imageUrl}
                                        alt=""
                                        width={32}
                                        height={32}
                                        className="rounded-full object-cover"
                                    />
                                    <span className="hidden max-w-28 truncate text-sm font-medium text-white sm:inline">
                                        {song.name}
                                    </span>
                                    {isThisPlaying && (
                                        <PlayButton
                                            isPlaying
                                            size={20}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleClick(song, queue);
                                            }}
                                            label={$vocabulary.PAUSE_SONG_NAME.replace("{name}", song.name)}
                                        />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
