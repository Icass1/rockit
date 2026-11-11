import type { BaseSongWithAlbumResponse } from "@/dto";

export interface OfflineCollectionOptions {
    isCurrent: () => boolean;
    save: (song: BaseSongWithAlbumResponse) => Promise<void>;
}
