import type { DownloadItemResponse } from "@/dto";

export type DownloadFilter = "all" | "active" | "completed" | "failed";
export type DownloadKind = "all" | "album" | "playlist";
export type DownloadView = {
    page: number;
    status: DownloadFilter;
    kind: DownloadKind;
    query: string;
};
export type DownloadDetail = {
    groupId: string;
    offset: number;
    items: DownloadItemResponse[];
    loading: boolean;
    hasMore: boolean;
    error: string | null;
};
