import { EContentType } from "@/models/enums/contentType";
import { EFilterMode } from "@/models/enums/filterMode";
import { EViewMode } from "@/models/enums/viewMode";

export interface ILibraryListsProps {
    filterMode: EFilterMode;
    searchQuery: string;
    activeType: EContentType;
    viewMode: EViewMode;
}
