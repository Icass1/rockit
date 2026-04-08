"use client";

import { QueueResponseItem } from "@/dto";
import { useStore } from "@nanostores/react";
import {
    GripVertical,
    HardDriveDownload,
    ListX,
    PlayCircle,
} from "lucide-react";
import { rockIt } from "@/lib/rockit/rockIt";
import ContextMenuContent from "@/components/ContextMenu/Content";
import ContextMenu from "@/components/ContextMenu/ContextMenu";
import ContextMenuOption from "@/components/ContextMenu/Option";
import ContextMenuTrigger from "@/components/ContextMenu/Trigger";
import AutoPlay from "@/components/PlayerUI/AutoPlay";
import { useQueueDrag } from "@/components/PlayerUI/hooks/useQueueDrag";
import { QueueMedia } from "@/components/PlayerUI/QueueMedia";

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
                                    <div className="w-full max-w-full min-w-0">
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
                                cover={queueMedia.media.imageUrl}
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
            <AutoPlay></AutoPlay>
        </>
    );
}
