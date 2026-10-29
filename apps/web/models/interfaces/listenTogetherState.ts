import type { QueueMediaItem } from "@rockit/shared";

export interface ListenTogetherQueueSnapshot {
    sorted: QueueMediaItem[];
    random: QueueMediaItem[];
    currentQueueMediaId: number | null;
    time: number;
}
