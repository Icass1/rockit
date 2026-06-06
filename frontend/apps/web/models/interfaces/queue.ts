import {
    BaseSongWithAlbumResponse,
    BaseSongWithoutAlbumResponse,
    BaseStationResponse,
    BaseVideoResponse,
} from "@/dto";

export interface QueueItem {
    queueMediaId: number;
    listPublicId: string | null;
    media:
        | BaseSongWithAlbumResponse
        | BaseSongWithoutAlbumResponse
        | BaseVideoResponse
        | BaseStationResponse;
}
