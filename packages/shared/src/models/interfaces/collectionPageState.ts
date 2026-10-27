import type { CollectionPageResponse } from "@/dto";
import type { TMedia } from "@/models/types/media";

export interface CollectionPageState {
    collection?: CollectionPageResponse["collection"];
    media: TMedia[];
    expandedByMediaId: Record<string, boolean>;
    query: string;
    offset: number;
    limit: number;
    total: number;
    hasMore: boolean;
    loading: boolean;
    error?: string;
}
