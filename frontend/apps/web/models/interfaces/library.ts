import { EContentType } from "@/models/enums/contentType";
import { EFilterMode } from "@/models/enums/filterMode";
import { TViewMode } from "@/models/types/viewMode";

export interface ILibraryListsProps {
    filterMode: EFilterMode;
    searchQuery: string;
    activeType: EContentType;
    viewMode: TViewMode;
}
