import {
    BaseAlbumWithoutSongsResponse,
    BasePlaylistWithoutMediasResponse,
    BaseSongWithAlbumResponse,
    BaseStationResponse,
    BaseVideoResponse,
    LibraryMediasResponse,
} from "@/dto";
import { EFilterMode } from "@/models/enums/filterMode";

export interface IUseLibraryDataProps {
    data: LibraryMediasResponse;
    username: string;
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
    librarySongIds: string[];
    filtered: TFilteredLibrary;
}

export interface ILibraryDataSnapshot extends TFilteredLibrary {
    source: LibraryMediasResponse;
}
