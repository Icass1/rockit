import {
    BaseAlbumWithoutSongsResponse,
    BasePlaylistResponse,
    BaseSongWithoutAlbumResponse,
    BaseStationResponse,
    BaseVideoResponse,
} from "@/dto";
import { EContentKind } from "@/models/enums/contentKind";

export type ILibraryMasonryItem =
    | { kind: typeof EContentKind.ALBUM; data: BaseAlbumWithoutSongsResponse }
    | { kind: typeof EContentKind.PLAYLIST; data: BasePlaylistResponse }
    | { kind: typeof EContentKind.VIDEO; data: BaseVideoResponse }
    | { kind: typeof EContentKind.SONG; data: BaseSongWithoutAlbumResponse }
    | { kind: typeof EContentKind.STATION; data: BaseStationResponse };
