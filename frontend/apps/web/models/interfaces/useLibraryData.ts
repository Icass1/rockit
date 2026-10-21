import {
    BaseAlbumWithoutSongsResponse,
    BasePlaylistWithoutMediasResponse,
    BaseSongWithAlbumResponse,
    BaseStationResponse,
    BaseVideoResponse,
} from "@/dto";
import { EFilterMode } from "@/models/enums/filterMode";

export interface IUseLibraryDataProps {
    filterMode: EFilterMode;
    searchQuery: string;
}

export type TFilteredLibrary = {
    albums: BaseAlbumWithoutSongsResponse[];
    playlists: BasePlaylistWithoutMediasResponse[];
    songs: BaseSongWithAlbumResponse[];
    videos: BaseVideoResponse[];
    stations: BaseStationResponse[];
    shared: BasePlaylistWithoutMediasResponse[];
};

export interface IUseLibraryDataReturn extends TFilteredLibrary {
    loading: boolean;
    filtered: TFilteredLibrary;
}
