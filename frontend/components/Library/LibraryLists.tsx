"use client";

import { ReactNode, useMemo } from "react";
import {
    BaseAlbumWithoutSongsResponse,
    BasePlaylistResponse,
    BaseSongWithoutAlbumResponse,
    BaseStationResponse,
    BaseVideoResponse,
} from "@/dto";
import { useStore } from "@nanostores/react";
import { rockIt } from "@/lib/rockit/rockIt";
import {
    ContentType,
    FilterMode,
    useLibraryData,
} from "@/components/Library/hooks/useLibraryData";
import {
    AlbumCard,
    PlaylistCard,
    SongCard,
    StationCard,
    VideoCard,
} from "@/components/Library/LibraryCards";
import { ViewMode } from "@/components/Library/LibraryFilters";
import {
    AlbumListView,
    AlbumRow,
    PlaylistRow,
    SongRow,
    StationRow,
    VideoRow,
} from "@/components/Library/LibraryRows";
import NewPlaylistButton from "@/components/Library/NewPlaylistButton";
import PlayLibraryButton from "@/components/Library/PlayLibraryButton";
import LoadingComponent from "@/components/Loading";

/* ------------------------------------------------------- */
/* PROPS                                                   */
/* ------------------------------------------------------- */

interface LibraryListsProps {
    filterMode: FilterMode;
    searchQuery: string;
    activeType: ContentType;
    viewMode: ViewMode;
}

/* ------------------------------------------------------- */
/* LAYOUT CONSTANTS                                        */
/* ------------------------------------------------------- */

/**
 * Standard responsive grid.
 * Each cell wraps a card that is internally capped at max-w-[250px].
 */
const GRID_CLASS =
    "grid grid-cols-2 gap-x-4 gap-y-5 px-4 py-4 " +
    "sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6";

/** Vertical list of compact rows. */
const ROW_LIST_CLASS = "flex flex-col px-4";

/**
 * CSS-columns masonry — no JS, no layout shifts.
 * Works on all browsers including iOS Safari.
 * Items with different aspect ratios (square vs 16:9) create natural height
 * variation that makes masonry look great.
 */
const MASONRY_CLASS =
    "columns-2 gap-4 px-4 py-4 " +
    "sm:columns-3 md:columns-4 lg:columns-5 xl:columns-6";

/* ------------------------------------------------------- */
/* SHARED UI PRIMITIVES                                    */
/* ------------------------------------------------------- */

function SectionHeader({
    title,
    rightElement,
}: {
    title: string;
    rightElement?: ReactNode;
}) {
    return (
        <div className="flex items-center justify-between px-4 pb-3 pt-4">
            <h2 className="text-3xl font-bold">{title}</h2>
            {rightElement}
        </div>
    );
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="flex items-center justify-center py-16 text-neutral-500">
            <p className="text-base font-medium">{message}</p>
        </div>
    );
}

/* ------------------------------------------------------- */
/* MASONRY — "ALL" TAB                                     */
/* ------------------------------------------------------- */

/**
 * A discriminated union so we can render all content types in one flat list
 * while keeping TypeScript happy without casting.
 */
type MasonryItem =
    | { kind: "album"; data: BaseAlbumWithoutSongsResponse }
    | { kind: "playlist"; data: BasePlaylistResponse }
    | { kind: "video"; data: BaseVideoResponse }
    | { kind: "song"; data: BaseSongWithoutAlbumResponse }
    | { kind: "station"; data: BaseStationResponse };

function MasonryAllGrid({
    albums,
    playlists,
    videos,
    songs,
    stations,
}: {
    albums: BaseAlbumWithoutSongsResponse[];
    playlists: BasePlaylistResponse[];
    videos: BaseVideoResponse[];
    songs: BaseSongWithoutAlbumResponse[];
    stations: BaseStationResponse[];
}) {
    /**
     * Interleave content types so the masonry looks varied rather than showing
     * all albums first, then all playlists, etc.
     * Strategy: zip by index across all arrays, cycling until exhausted.
     */
    const items = useMemo<MasonryItem[]>(() => {
        const buckets: MasonryItem[][] = [
            albums.map((d) => ({ kind: "album" as const, data: d })),
            playlists.map((d) => ({ kind: "playlist" as const, data: d })),
            videos.map((d) => ({ kind: "video" as const, data: d })),
            songs.map((d) => ({ kind: "song" as const, data: d })),
            stations.map((d) => ({ kind: "station" as const, data: d })),
        ];

        const result: MasonryItem[] = [];
        const maxLen = Math.max(...buckets.map((b) => b.length));

        for (let i = 0; i < maxLen; i++) {
            for (const bucket of buckets) {
                if (i < bucket.length) result.push(bucket[i]);
            }
        }

        return result;
    }, [albums, playlists, videos, songs, stations]);

    if (items.length === 0) return null;

    return (
        <div className={MASONRY_CLASS}>
            {items.map((item) => {
                /**
                 * break-inside-avoid prevents a card from being split across
                 * two columns. mb-4 gives consistent spacing between cards.
                 */
                const wrapClass = "break-inside-avoid mb-4";

                switch (item.kind) {
                    case "album":
                        return (
                            <div
                                key={`album-${item.data.publicId}`}
                                className={wrapClass}
                            >
                                <AlbumCard album={item.data} />
                            </div>
                        );
                    case "playlist":
                        return (
                            <div
                                key={`playlist-${item.data.publicId}`}
                                className={wrapClass}
                            >
                                <PlaylistCard playlist={item.data} />
                            </div>
                        );
                    case "video":
                        return (
                            <div
                                key={`video-${item.data.publicId}`}
                                className={wrapClass}
                            >
                                <VideoCard video={item.data} />
                            </div>
                        );
                    case "song":
                        return (
                            <div
                                key={`song-${item.data.publicId}`}
                                className={wrapClass}
                            >
                                <SongCard song={item.data} />
                            </div>
                        );
                    case "station":
                        return (
                            <div
                                key={`station-${item.data.publicId}`}
                                className={wrapClass}
                            >
                                <StationCard station={item.data} />
                            </div>
                        );
                }
            })}
        </div>
    );
}

/**
 * "All" tab in list mode: sections with a small header per content type,
 * each rendered as compact rows.
 */
function SectionedAllList({
    albums,
    playlists,
    videos,
    songs,
    stations,
}: {
    albums: BaseAlbumWithoutSongsResponse[];
    playlists: BasePlaylistResponse[];
    videos: BaseVideoResponse[];
    songs: BaseSongWithoutAlbumResponse[];
    stations: BaseStationResponse[];
}) {
    return (
        <div>
            {playlists.length > 0 && (
                <section>
                    <SectionHeader title="PLAYLISTS" />
                    <div className={ROW_LIST_CLASS}>
                        {playlists.map((pl) => (
                            <PlaylistRow key={pl.publicId} playlist={pl} />
                        ))}
                    </div>
                </section>
            )}

            {albums.length > 0 && (
                <section>
                    <SectionHeader title="ALBUMS" />
                    <div className={ROW_LIST_CLASS}>
                        {albums.map((al) => (
                            <AlbumRow key={al.publicId} album={al} />
                        ))}
                    </div>
                </section>
            )}

            {songs.length > 0 && (
                <section>
                    <SectionHeader title="SONGS" />
                    <div className={ROW_LIST_CLASS}>
                        {songs.map((s) => (
                            <SongRow key={s.publicId} song={s} />
                        ))}
                    </div>
                </section>
            )}

            {videos.length > 0 && (
                <section>
                    <SectionHeader title="VIDEOS" />
                    <div className={ROW_LIST_CLASS}>
                        {videos.map((v) => (
                            <VideoRow key={v.publicId} video={v} />
                        ))}
                    </div>
                </section>
            )}

            {stations.length > 0 && (
                <section>
                    <SectionHeader title="RADIO_STATIONS" />
                    <div className={ROW_LIST_CLASS}>
                        {stations.map((st) => (
                            <StationRow key={st.publicId} station={st} />
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}

/* ------------------------------------------------------- */
/* MAIN EXPORT                                             */
/* ------------------------------------------------------- */

export function LibraryLists({
    filterMode,
    searchQuery,
    activeType,
    viewMode,
}: LibraryListsProps) {
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const { filtered, loading } = useLibraryData({ filterMode, searchQuery });

    const showAll = activeType === "all";

    if (loading) return <LoadingComponent />;

    return (
        <section>
            {/* ── ALL tab ───────────────────────────────────────────────
                Grid mode  → masonry mixing every content type.
                List mode  → sectioned rows grouped by content type.
                The grid/list toggle is hidden in LibraryClient when
                activeType === "all" — this view always shows both.       */}
            {showAll && (
                <>
                    <SectionHeader
                        title={$vocabulary.YOUR_ALBUMS_PLAYLISTS}
                        rightElement={<PlayLibraryButton />}
                    />

                    {viewMode === "list" ? (
                        <SectionedAllList
                            albums={filtered.albums}
                            playlists={filtered.playlists}
                            videos={filtered.videos}
                            songs={filtered.songs}
                            stations={filtered.stations}
                        />
                    ) : (
                        <>
                            {/* NewPlaylistButton sits above the masonry */}
                            <div className="px-4 py-2">
                                <div className="max-w-62.5 w-full">
                                    <NewPlaylistButton />
                                </div>
                            </div>
                            <MasonryAllGrid
                                albums={filtered.albums}
                                playlists={filtered.playlists}
                                videos={filtered.videos}
                                songs={filtered.songs}
                                stations={filtered.stations}
                            />
                        </>
                    )}
                </>
            )}

            {/* ── ALBUMS tab ────────────────────────────────────────────── */}
            {activeType === "albums" &&
                (filtered.albums.length === 0 ? (
                    <EmptyState message={$vocabulary.NO_ALBUMS} />
                ) : viewMode === "list" ? (
                    <AlbumListView albums={filtered.albums} />
                ) : (
                    <div className={GRID_CLASS}>
                        {filtered.albums.map((al) => (
                            <AlbumCard key={al.publicId} album={al} />
                        ))}
                    </div>
                ))}

            {/* ── PLAYLISTS tab ─────────────────────────────────────────── */}
            {activeType === "playlists" &&
                (filtered.playlists.length === 0 ? (
                    <EmptyState message={$vocabulary.NO_PLAYLISTS} />
                ) : viewMode === "list" ? (
                    <div className={ROW_LIST_CLASS}>
                        {filtered.playlists.map((pl) => (
                            <PlaylistRow key={pl.publicId} playlist={pl} />
                        ))}
                    </div>
                ) : (
                    <div className={GRID_CLASS}>
                        <NewPlaylistButton />
                        {filtered.playlists.map((pl) => (
                            <PlaylistCard key={pl.publicId} playlist={pl} />
                        ))}
                    </div>
                ))}

            {/* ── SONGS (always rows — grid adds nothing for songs) ─────── */}
            {activeType === "songs" &&
                (filtered.songs.length === 0 ? (
                    <EmptyState message={$vocabulary.NO_SONGS} />
                ) : (
                    <div className={ROW_LIST_CLASS}>
                        {filtered.songs.map((s) => (
                            <SongRow key={s.publicId} song={s} />
                        ))}
                    </div>
                ))}

            {/* ── VIDEOS tab ────────────────────────────────────────────── */}
            {activeType === "videos" &&
                (filtered.videos.length === 0 ? (
                    <EmptyState message={$vocabulary.NO_VIDEOS} />
                ) : viewMode === "list" ? (
                    <div className={ROW_LIST_CLASS}>
                        {filtered.videos.map((v) => (
                            <VideoRow key={v.publicId} video={v} />
                        ))}
                    </div>
                ) : (
                    <div className={GRID_CLASS}>
                        {filtered.videos.map((v) => (
                            <VideoCard key={v.publicId} video={v} />
                        ))}
                    </div>
                ))}

            {/* ── STATIONS (always rows) ────────────────────────────────── */}
            {activeType === "stations" &&
                (filtered.stations.length === 0 ? (
                    <EmptyState message={$vocabulary.NO_STATIONS} />
                ) : (
                    <div className={ROW_LIST_CLASS}>
                        {filtered.stations.map((st) => (
                            <StationRow key={st.publicId} station={st} />
                        ))}
                    </div>
                ))}
        </section>
    );
}
