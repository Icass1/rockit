import type { BaseSongWithAlbumResponse } from "@/dto";

export interface OfflineCollectionOptions {
    isCurrent: () => boolean;
    save: (
        song: BaseSongWithAlbumResponse,
        collections: OfflineCollectionReference[]
    ) => Promise<void>;
}

export interface OfflineCollectionReference {
    publicId: string;
    type: "album" | "playlist";
    name: string;
}
