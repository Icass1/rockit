import { type TQueueMedia } from "@/models/types/media";

// A single entry in the play queue: the resolved playable media plus the ids
// used to address/order it. Shared between web and mobile queue managers.
export interface QueueMediaItem {
    queueMediaId: number;
    listPublicId: string | null;
    media: TQueueMedia;
}

// Backwards-compatible alias for existing web imports of `QueueItem` from
// `@/models/interfaces/queue`. Not re-exported through the package barrel to
// avoid colliding with the DTO `QueueItem`.
export type QueueItem = QueueMediaItem;
