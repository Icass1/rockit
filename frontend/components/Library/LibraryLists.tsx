"use client";

import { ReactNode, useMemo } from "react";
import {
    BaseAlbumWithoutSongsResponse,
    BasePlaylistResponse,
    BaseSongWithoutAlbumResponse,
    BaseVideoResponse,
} from "@/dto";
import { useLanguage } from "@/contexts/LanguageContext";
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
        <div className="flex items-center justify-between px-5 pb-3 pt-4 md:px-0">
            <h2 className="text-2xl font-bold">{title}</h2>
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
    | { kind: "station"; data: BaseSongWithoutAlbumResponse };

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
    stations: BaseSongWithoutAlbumResponse[];
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

// ─── Card / Row components ────────────────────────────────────────────────────

function PlaylistCard({ playlist }: { playlist: BasePlaylistResponse }) {
    return (
        <AddListContextMenu list={playlist}>
            <Link
                href={`/playlist/${playlist.publicId}`}
                className="library-item flex h-auto w-full min-w-0 max-w-full flex-col transition-transform md:hover:scale-110"
            >
                <Image
                    alt={playlist.name}
                    className="cover aspect-square h-auto w-full rounded-md"
                    src={
                        playlist.internalImageUrl ??
                        rockIt.PLAYLIST_PLACEHOLDER_IMAGE_URL
                    }
                    width={600}
                    height={600}
                />
                <label className="min-h-6 truncate text-center font-semibold">
                    {playlist.name}
                </label>
                <label className="min-h-5 truncate text-center text-sm text-gray-400">
                    {playlist.owner}
                </label>
            </Link>
        </AddListContextMenu>
    );
}

function AlbumCard({ album }: { album: BaseAlbumWithoutSongsResponse }) {
    return (
        <AddListContextMenu list={album}>
            <Link
                href={`/album/${album.publicId}`}
                className="library-item flex h-auto w-full min-w-0 max-w-full flex-col transition-transform md:hover:scale-110"
            >
                <Image
                    alt={album.name}
                    className="cover aspect-square h-auto w-full rounded-md"
                    src={
                        album.internalImageUrl ??
                        rockIt.ALBUM_PLACEHOLDER_IMAGE_URL
                    }
                    width={600}
                    height={600}
                />
                <label className="mt-1 truncate text-center font-semibold">
                    {album.name}
                </label>
                <div className="mx-auto flex max-w-full flex-row truncate text-center text-sm text-gray-400">
                    {album.artists.map((artist, i) => (
                        <label
                            key={artist.publicId}
                            className="truncate md:hover:underline"
                        >
                            {artist.name}
                            {i < album.artists.length - 1 ? ", " : ""}
                        </label>
                    ))}
                </div>
            </Link>
        </AddListContextMenu>
    );
}

function SongRow({ song }: { song: BaseSongWithoutAlbumResponse }) {
    const handlePlay = () => {
        // TODO: implement song playback from library
    };

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={handlePlay}
            onKeyDown={(e) => e.key === "Enter" && handlePlay()}
            className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 transition hover:bg-neutral-800"
        >
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md">
                <Image
                    src={
                        song.internalImageUrl ??
                        rockIt.SONG_PLACEHOLDER_IMAGE_URL
                    }
                    alt={song.name}
                    fill
                    className="object-cover"
                />
            </div>
            <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-white">{song.name}</p>
                <p className="truncate text-sm text-neutral-400">
                    {song.artists?.map((a) => a.name).join(", ") ||
                        "Unknown Artist"}
                </p>
            </div>
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
    lang,
}: {
    albums: BaseAlbumWithoutSongsResponse[];
    playlists: BasePlaylistResponse[];
    videos: BaseVideoResponse[];
    songs: BaseSongWithoutAlbumResponse[];
    stations: BaseSongWithoutAlbumResponse[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    lang: any;
}) {
    return (
        <div
            role="button"
            tabIndex={0}
            onClick={handlePlay}
            onKeyDown={(e) => e.key === "Enter" && handlePlay()}
            className="library-item flex h-auto w-full min-w-0 max-w-full flex-col transition-transform md:hover:scale-110"
        >
            <div className="relative aspect-video w-full overflow-hidden rounded-md">
                <Image
                    alt={video.name}
                    className="object-cover"
                    src={
                        video.internalImageUrl ??
                        rockIt.SONG_PLACEHOLDER_IMAGE_URL
                    }
                    fill
                />
            </div>
            <label className="mt-1 truncate text-center font-semibold">
                {video.name}
            </label>
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
    const { langFile: lang } = useLanguage();
    const { filtered, loading } = useLibraryData({ filterMode, searchQuery });

    const showAll = activeType === "all";

    if (loading || !lang) return <LoadingComponent />;

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
                        title={lang.your_albums_playlists}
                        rightElement={<PlayLibraryButton />}
                    />

                    {viewMode === "list" ? (
                        <SectionedAllList
                            albums={filtered.albums}
                            playlists={filtered.playlists}
                            videos={filtered.videos}
                            songs={filtered.songs}
                            stations={filtered.stations}
                            lang={lang}
                        />
                    ) : (
                        <>
                            {/* NewPlaylistButton sits above the masonry */}
                            <div className="px-4 py-2">
                                <div className="w-full max-w-[250px]">
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
                    <EmptyState message={lang.no_albums ?? "No albums found"} />
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
                    <EmptyState
                        message={lang.no_playlists ?? "No playlists found"}
                    />
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
                    <EmptyState message={lang.no_songs ?? "No songs found"} />
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
                    <EmptyState message={lang.no_videos ?? "No videos found"} />
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
                    <EmptyState
                        message={lang.no_stations ?? "No radio stations found"}
                    />
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
