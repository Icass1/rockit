import type { PointerEvent } from "react";
import type { TMedia } from "@rockit/shared";

export type LibraryDragMedia = Extract<TMedia, { type: "song" | "album" }>;

export interface LibraryDragDropState {
    enabled: boolean;
    source: LibraryDragMedia | null;
    targetId: string | null;
    ownedIds: ReadonlySet<string>;
    pendingIds: ReadonlySet<string>;
    successIds: ReadonlySet<string>;
    start: (
        media: LibraryDragMedia,
        event: PointerEvent<HTMLDivElement>
    ) => void;
    suppressClick: () => boolean;
}
