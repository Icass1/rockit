import type { QueueMediaItem } from "@/models/interfaces/queue";

export interface ListenTogetherQueueSnapshot {
    sorted: QueueMediaItem[];
    random: QueueMediaItem[];
    currentQueueMediaId: number | null;
    time: number;
    total?: number;
    pages?: [number, QueueMediaItem[]][];
}
