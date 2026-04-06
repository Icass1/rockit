import { LibraryListsResponse } from "@/dto";
import { EFilterMode } from "@/models/enums/filterMode";

export interface IUseLibraryDataProps {
    filterMode: EFilterMode;
    searchQuery: string;
}

export type TFilteredLibrary = {
    albums: LibraryListsResponse["albums"];
    playlists: LibraryListsResponse["playlists"];
    songs: LibraryListsResponse["songs"];
    videos: LibraryListsResponse["videos"];
    stations: LibraryListsResponse["stations"];
    shared: LibraryListsResponse["shared"];
};

export interface IUseLibraryDataReturn extends TFilteredLibrary {
    loading: boolean;
    filtered: TFilteredLibrary;
}
