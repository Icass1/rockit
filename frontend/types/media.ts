import {
    BaseSongWithAlbumResponse,
    BaseStationResponse,
    BaseVideoResponse,
} from "@/dto";

export type MediaType =
    | BaseSongWithAlbumResponse
    | BaseVideoResponse
    | BaseStationResponse;
