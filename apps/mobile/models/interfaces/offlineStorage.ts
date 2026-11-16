import type { OfflineSongRecord } from "@rockit/platform-browser/offline/db";

export type OfflineStorageMode = "albums" | "playlists" | "songs";
export interface OfflineStorageGroup {
    key: string;
    title: string;
    songs: OfflineSongRecord[];
}
export type OfflineStorageEntry =
    | { kind: "group"; group: OfflineStorageGroup }
    | { kind: "song"; song: OfflineSongRecord };
