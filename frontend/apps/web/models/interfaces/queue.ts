import {
    BaseSongWithAlbumResponse,
    BaseSongWithoutAlbumResponse,
    BaseVideoResponse,
} from "@/dto";

export interface QueueItem {
    queueMediaId: number;
    listPublicId: string | null;
    media:
        | BaseSongWithAlbumResponse
        | BaseSongWithoutAlbumResponse
        | BaseVideoResponse;
}
