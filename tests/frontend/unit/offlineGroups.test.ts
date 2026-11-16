import type { OfflineSongRecord } from "@rockit/platform-browser/offline/db";
import type { Vocabulary } from "@rockit/shared";
import { expect, it } from "vitest";
import {
    groupOfflineSongs,
    matchesOfflineSong,
} from "../../../apps/mobile/lib/storage/offlineGroups.web";

const vocabulary = {
    OFFLINE_STORAGE_OTHER: "Other downloads",
    OFFLINE_STORAGE_UNGROUPED: "Individual songs",
    RECENT_MIX: "Recent Mix",
} as Vocabulary;
function record(
    id: string,
    album?: string,
    playlist?: string
): OfflineSongRecord {
    return {
        publicId: id,
        name: id,
        sizeBytes: 5,
        downloadedAt: 1,
        coverBlob: null,
        audioBlob: new Blob(["audio"]),
        ...(album
            ? {
                  media: {
                      publicId: id,
                      name: id,
                      type: "song",
                      artists: [{ name: "Artist" }],
                      album: { publicId: album, name: album },
                  },
              }
            : {}),
        ...(playlist
            ? {
                  savedCollections: [
                      { publicId: playlist, type: "playlist", name: playlist },
                  ],
              }
            : {}),
    } as OfflineSongRecord;
}
it("groups existing downloads by their album metadata and preserves loose songs", () => {
    const groups = groupOfflineSongs(
        [record("one", "Album"), record("two", "Album"), record("loose")],
        "albums",
        vocabulary,
        "en"
    );
    expect(groups.map((group) => [group.title, group.songs.length])).toEqual([
        ["Album", 2],
        ["Individual songs", 1],
    ]);
});
it("keeps playlist membership without duplicating its songs and localizes Rockit list names", () => {
    const groups = groupOfflineSongs(
        [
            record("one", "A", "recent-mix"),
            record("two", "B", "recent-mix"),
            record("loose"),
        ],
        "playlists",
        vocabulary,
        "en"
    );
    expect(
        groups.map((group) => [
            group.title,
            group.songs.map((song) => song.publicId),
        ])
    ).toEqual([
        ["Recent Mix", ["one", "two"]],
        ["Other downloads", ["loose"]],
    ]);
});
it("finds songs through track, artist and album names without a network lookup", () => {
    const song = record("Track", "Album");
    for (const query of ["track", "ARTIST", "album"])
        expect(matchesOfflineSong(song, query, "en")).toBe(true);
    expect(matchesOfflineSong(song, "missing", "en")).toBe(false);
});

it("orders an album by disc and track rather than IndexedDB IDs", () => {
    const second = record("a", "Album"),
        first = record("z", "Album");
    second.media = { ...second.media!, discNumber: 1, trackNumber: 2 };
    first.media = { ...first.media!, discNumber: 1, trackNumber: 1 };
    const [album] = groupOfflineSongs(
        [second, first],
        "albums",
        vocabulary,
        "en"
    );
    expect(album.songs.map((song) => song.publicId)).toEqual(["z", "a"]);
});
