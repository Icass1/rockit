import type { LibraryMediasResponse, UserStatsResponse } from "@/dto";
import { EContentType } from "@/models/enums/contentType";
import { EFilterMode } from "@/models/enums/filterMode";
import { EViewMode } from "@/models/enums/viewMode";

export interface ILibraryInitialData {
    username: string;
    library: LibraryMediasResponse;
    topAlbums: UserStatsResponse["topAlbums"];
}

export interface ILibraryListsProps {
    initialData: ILibraryInitialData;
    filterMode: EFilterMode;
    searchQuery: string;
    activeType: EContentType;
    viewMode: EViewMode;
}
