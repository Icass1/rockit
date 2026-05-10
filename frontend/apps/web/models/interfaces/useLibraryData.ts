import { LibraryMediasResponse } from "@/dto";
import { EFilterMode } from "@/models/enums/filterMode";

export interface IUseLibraryDataProps {
    filterMode: EFilterMode;
    searchQuery: string;
}

export type TFilteredLibrary = {
    albums: LibraryMediasResponse["albums"];
    playlists: LibraryMediasResponse["playlists"];
    songs: LibraryMediasResponse["songs"];
    videos: LibraryMediasResponse["videos"];
    stations: LibraryMediasResponse["stations"];
    shared: LibraryMediasResponse["shared"];
};

export interface IUseLibraryDataReturn extends TFilteredLibrary {
    loading: boolean;
    filtered: TFilteredLibrary;
}
