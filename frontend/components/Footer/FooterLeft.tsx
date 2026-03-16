"use client";

import Image from "next/image";
import { useStore } from "@nanostores/react";
import {
    EllipsisVertical,
    Pause,
    PauseIcon,
    Play,
    PlayIcon,
} from "lucide-react";
import { getMediaArtists, MediaType } from "@/types/media";
import { Station } from "@/types/station";
import { rockIt } from "@/lib/rockit/rockIt";
import Artists from "@/components/Artists/Artists";
import LikeButton from "@/components/LikeButton";
import MediaPopupMenu from "@/components/MediaPopupMenu";

function FooterLeftForSong({ currentMedia }: { currentMedia: MediaType }) {
    const $playing = useStore(rockIt.audioManager.playingAtom);
    const $queue = useStore(rockIt.queueManager.queueAtom);

    if (!$queue) {
        return (
            <div className="flex w-full min-w-0 max-w-full items-center gap-x-4 text-sm text-gray-400 opacity-0 md:w-1/3" />
        );
    }

    return (
        <div className="grid w-full min-w-0 max-w-full grid-cols-[min-content_1fr_min-content] items-center gap-x-4 pr-2 md:w-1/3">
            {/* Album cover */}
            <div
                className="group relative h-9 w-9 cursor-pointer rounded-md md:h-16 md:w-16"
                onClick={() => rockIt.audioManager.togglePlayPauseOrSetMedia()}
            >
                <Image
                    width={64}
                    height={64}
                    src={currentMedia.imageUrl}
                    alt={`Cover of ${currentMedia.name}`}
                    className="absolute h-9 w-9 select-none rounded-md object-cover transition duration-300 group-hover:brightness-50 md:h-16 md:w-16"
                />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 transition group-hover:opacity-100">
                    {$playing ? (
                        <Pause className="h-6 w-6 fill-current text-white md:h-8 md:w-8" />
                    ) : (
                        <Play className="h-6 w-6 fill-current text-white md:h-8 md:w-8" />
                    )}
                </div>
            </div>

            {/* Song info */}
            <div className="relative h-full w-full min-w-0 max-w-full overflow-hidden">
                <div className="relative top-1/2 flex -translate-y-1/2 flex-col">
                    <span className="w-full min-w-0 max-w-full truncate font-semibold">
                        {currentMedia.name || "Unknown song"}
                    </span>
                    <div className="flex w-full flex-row gap-x-1 text-sm text-gray-400">
                        <div className="truncate">
                            <Artists
                                artists={getMediaArtists(currentMedia) ?? []}
                            ></Artists>
                        </div>
                        <span className="hidden select-none md:block">•</span>
                        <span>TODO</span>
                        {/* <Link
                            href={`/album/${currentMedia.album.publicId}`}
                            prefetch={false}
                            onClick={() => rockIt.playerUIManager.hide()}
                            className="hidden truncate md:inline-block md:hover:underline"
                        >
                            {currentMedia.album.name || "Unknown album"}
                        </Link> */}
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="hidden flex-row items-center gap-1 md:flex">
                <LikeButton mediaPublicId={currentMedia.publicId} />
                <MediaPopupMenu media={currentMedia}>
                    <EllipsisVertical className="h-6 w-5 text-gray-400 md:hover:scale-105 md:hover:text-white" />
                </MediaPopupMenu>
            </div>
        </div>
    );
}

function FooterLeftForStation({ currentStation }: { currentStation: Station }) {
    const $playing = useStore(rockIt.audioManager.playingAtom);

    return (
        <div className="flex w-full min-w-0 max-w-full items-center gap-x-4 md:w-1/3">
            {/* Station cover — hover con CSS group, sin useState */}
            <div className="group relative h-9 w-9 overflow-hidden rounded-md md:h-16 md:w-16">
                <Image
                    width={64}
                    height={64}
                    src={currentStation.favicon}
                    alt={currentStation.name}
                    className="absolute h-full w-full select-none object-cover"
                />
                <div className="absolute inset-0 hidden items-center justify-center bg-neutral-500/70 group-hover:flex">
                    {$playing ? (
                        <PauseIcon
                            className="h-6 w-6 cursor-pointer text-white"
                            onClick={() => rockIt.audioManager.pause()}
                        />
                    ) : (
                        <PlayIcon
                            className="h-6 w-6 cursor-pointer text-white"
                            onClick={() => rockIt.audioManager.play()}
                        />
                    )}
                </div>
            </div>

            <div className="flex min-w-0 flex-1 flex-col">
                <span className="line-clamp-1 truncate font-semibold">
                    {currentStation.name}
                </span>
                <span className="text-sm text-gray-400">
                    {currentStation.country}
                </span>
            </div>

            <div className="hidden flex-row pr-4 md:flex">
                <EllipsisVertical className="h-6 w-5 text-gray-400 md:hover:scale-105 md:hover:text-white" />
            </div>
        </div>
    );
}

export default function FooterLeft() {
    const $currentSong = useStore(rockIt.queueManager.currentMediaAtom);
    const $currentStation = useStore(rockIt.stationManager.currentStationAtom);

    if ($currentSong) return <FooterLeftForSong currentMedia={$currentSong} />;
    if ($currentStation)
        return <FooterLeftForStation currentStation={$currentStation} />;

    return (
        <div className="flex w-full min-w-0 max-w-full items-center gap-x-4 text-sm text-gray-400 md:w-1/3">
            Nothing playing
        </div>
    );
}
