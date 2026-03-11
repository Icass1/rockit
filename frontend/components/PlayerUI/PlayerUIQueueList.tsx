"use client";

import { QueueResponseItem } from "@/dto";
import { useStore } from "@nanostores/react";
import {
    GripVertical,
    HardDriveDownload,
    ListPlus,
    ListX,
    PlayCircle,
} from "lucide-react";
import { rockIt } from "@/lib/rockit/rockIt";
import ContextMenuContent from "@/components/ContextMenu/Content";
import ContextMenu from "@/components/ContextMenu/ContextMenu";
import ContextMenuOption from "@/components/ContextMenu/Option";
import ContextMenuTrigger from "@/components/ContextMenu/Trigger";
import { useQueueDrag } from "@/components/PlayerUI/hooks/useQueueDrag";
import { QueueMedia } from "@/components/PlayerUI/QueueMedia";

// Placeholder medias shown below the real queue (mockup until autoplay is implemented)
const AUTO_PLAY_MOCKS = [
    { id: "auto1", title: "Neon Nights", artist: "Synthwave Dreams" },
    { id: "auto2", title: "Midnight Ride", artist: "Retro Driver" },
    { id: "auto3", title: "Digital Sunset", artist: "Pixel Horizons" },
    { id: "auto4", title: "Electric Pulse", artist: "Voltage" },
    { id: "auto5", title: "Echoes in the Dark", artist: "Shadow Sound" },
];

export function PlayerUIQueueList({
    queue,
    queueScroll,
}: {
    queue: QueueResponseItem[];
    queueScroll: number;
}) {
    const $currentQueueMediaId = useStore(
        rockIt.queueManager.currentQueueMediaIdAtom
    );
    const { draggingMedia, startDrag, calcItemTop } = useQueueDrag();

    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);

    // TODO: implement when queueManager.reorderQueue is available
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const handleRemoveMedia = (_media: QueueResponseItem) => {};
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const handlePlayMedia = async (_media: QueueResponseItem) => {};

    return (
        <>
            <div style={{ height: queue.length * 64 }} />

            {queue.map((queueMedia, index) => {
                const top = calcItemTop(index, queueMedia, queueScroll);
                const isDragging =
                    draggingMedia?.media.media.publicId ===
                    queueMedia.media.publicId;

                // if (top > queueScroll || top < queueScroll) {
                //     return null;
                // }

                return (
                    <div
                        key={`${queueMedia.media.publicId}-${queueMedia.queueMediaId}`}
                        className={`absolute w-full ${isDragging ? "z-10" : "transition-[top] duration-200"}`}
                        style={{
                            top: `${top + 20}px`,
                            transitionTimingFunction:
                                "cubic-bezier(0.4, 0, 0.2, 1)",
                        }}
                    >
                        <ContextMenu>
                            <ContextMenuTrigger>
                                <div className="grid grid-cols-[1fr_45px] items-center">
                                    <div className="w-full min-w-0 max-w-full">
                                        <QueueMedia media={queueMedia} />
                                    </div>
                                    <GripVertical
                                        className="h-full w-full p-1 pr-3"
                                        onMouseDown={(e) =>
                                            startDrag(
                                                e.clientY,
                                                queueMedia,
                                                index
                                            )
                                        }
                                    />
                                </div>
                            </ContextMenuTrigger>
                            <ContextMenuContent
                                cover={queueMedia.media.internalImageUrl}
                                title={queueMedia.media.name}
                                // description={`${queueMedia.media.album.name} • ${queueMedia.media.artists.map((a) => a.name).join(", ")}`}
                            >
                                <ContextMenuOption
                                    onClick={() => handlePlayMedia(queueMedia)}
                                >
                                    <PlayCircle className="h-5 w-5" />
                                    {$vocabulary.PLAY_MEDIA}
                                </ContextMenuOption>
                                <ContextMenuOption
                                    onClick={() =>
                                        handleRemoveMedia(queueMedia)
                                    }
                                    disable={
                                        $currentQueueMediaId ===
                                        queueMedia.queueMediaId
                                    }
                                >
                                    <ListX className="h-5 w-5" />
                                    {$vocabulary.REMOVE_FROM_QUEUE}
                                </ContextMenuOption>
                                <ContextMenuOption
                                    onClick={() =>
                                        rockIt.indexedDBManager.saveMediaToIndexedDB(
                                            queueMedia.media
                                        )
                                    }
                                >
                                    <HardDriveDownload className="h-5 w-5" />
                                    {$vocabulary.DOWNLOAD_MEDIA_TO_DEVICE}
                                </ContextMenuOption>
                            </ContextMenuContent>
                        </ContextMenu>
                    </div>
                );
            })}

            {/* Auto-play section */}
            <div>
                <div className="mt-5 h-px w-full bg-neutral-400" />
                <h2 className="text-md my-2 px-4 font-semibold text-neutral-400">
                    Reproducciones automáticas a continuación
                </h2>
                {AUTO_PLAY_MOCKS.map((mock, i) => {
                    const autoMedia: QueueResponseItem = {
                        queueMediaId: -i - 1, // Negative IDs for mock medias
                        listPublicId: "",
                        media: {
                            type: "song",
                            downloaded: false,
                            internalImageUrl: "/image/media-placeholder.png",
                            duration: 123,
                            discNumber: 1,
                            trackNumber: 1,
                            provider: "mock",
                            audioSrc: null,
                            publicId: `auto-${mock.id}`,
                            url: "",
                            name: mock.title,
                            album: {
                                type: "album",
                                name: "Single",
                                releaseDate: "2024-01-01",
                                internalImageUrl:
                                    "/image/media-placeholder.png",
                                provider: "mock",
                                publicId: `auto-album-${mock.id}`,
                                url: "",
                                artists: [
                                    {
                                        provider: "mock",
                                        publicId: "publicId",
                                        internalImageUrl:
                                            "/image/media-placeholder.png",
                                        name: mock.artist,
                                        url: "",
                                    },
                                ],
                            },
                            artists: [
                                {
                                    provider: "mock",
                                    publicId: "publicId",
                                    internalImageUrl:
                                        "/image/media-placeholder.png",
                                    name: mock.artist,
                                    url: "",
                                },
                            ],
                        },
                    };

                    return (
                        <div
                            key={`auto-${mock.id}`}
                            className="relative w-full transition-[top] duration-200"
                            style={{
                                transitionTimingFunction:
                                    "cubic-bezier(0.4, 0, 0.2, 1)",
                            }}
                        >
                            <ContextMenu>
                                <ContextMenuTrigger>
                                    <div className="grid grid-cols-[1fr_45px] items-center">
                                        <div className="w-full min-w-0 max-w-full">
                                            <QueueMedia media={autoMedia} />
                                        </div>
                                        <ListPlus className="h-full w-full p-1 pr-4" />
                                    </div>
                                </ContextMenuTrigger>
                                <ContextMenuContent
                                    cover={
                                        autoMedia.media.internalImageUrl ??
                                        rockIt.SONG_PLACEHOLDER_IMAGE_URL
                                    }
                                    title={autoMedia.media.name}
                                    // description={`${autoMedia.media.album.name} • ${autoMedia.media.artists.map((a) => a.name).join(", ")}`}
                                >
                                    <ContextMenuOption
                                        onClick={() =>
                                            handlePlayMedia(autoMedia)
                                        }
                                    >
                                        <PlayCircle className="h-5 w-5" />
                                        {$vocabulary.PLAY_MEDIA}
                                    </ContextMenuOption>
                                    <ContextMenuOption
                                        onClick={() =>
                                            handleRemoveMedia(autoMedia)
                                        }
                                        disable={
                                            $currentQueueMediaId ===
                                            autoMedia.queueMediaId
                                        }
                                    >
                                        <ListX className="h-5 w-5" />
                                        {$vocabulary.REMOVE_FROM_QUEUE}
                                    </ContextMenuOption>
                                    <ContextMenuOption
                                        onClick={() =>
                                            rockIt.indexedDBManager.saveMediaToIndexedDB(
                                                autoMedia.media
                                            )
                                        }
                                    >
                                        <HardDriveDownload className="h-5 w-5" />
                                        {$vocabulary.DOWNLOAD_MEDIA_TO_DEVICE}
                                    </ContextMenuOption>
                                </ContextMenuContent>
                            </ContextMenu>
                        </div>
                    );
                })}
            </div>
        </>
    );
}
