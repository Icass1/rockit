"use client";

import {
    ReactNode,
    useCallback,
    useEffect,
    useMemo,
    useState,
    type JSX,
} from "react";
import Image from "next/image";
import Link from "next/link";
import {
    BaseAlbumWithoutSongsResponse,
    BasePlaylistWithoutMediasResponse,
    BaseSongWithoutAlbumResponse,
    BaseStationResponse,
    BaseVideoResponse,
} from "@/dto";
import { useStore } from "@nanostores/react";
import { Disc3, Heart, History, Play } from "lucide-react";
import { EContentType } from "@/models/enums/contentType";
import { EViewMode } from "@/models/enums/viewMode";
import { ILibraryListsProps } from "@/models/interfaces/library";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";
import {
    expandAlbumsToPlayable,
    expandPlaylistsToPlayable,
} from "@/lib/services/mediaService";
import { useLibraryData } from "@/components/Library/hooks/useLibraryData";
import {
    AlbumCard,
    PlaylistCard,
    SongCard,
    StationCard,
    VideoCard,
} from "@/components/Library/LibraryCards";
import {
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
/* LAYOUT CONSTANTS                                        */
/* ------------------------------------------------------- */

const GRID_CLASS =
    "grid grid-cols-2 gap-x-3 gap-y-4 px-4 py-4 md:grid-cols-[repeat(auto-fill,_250px)] md:gap-x-4 md:gap-y-5";

const CHIP_GRID_CLASS =
    "grid grid-cols-[repeat(auto-fit,_minmax(200px,250px))] justify-start gap-0.5 px-2 py-1";

/* ------------------------------------------------------- */
/* INTERLEAVE UTILITY                                      */
/* ------------------------------------------------------- */

type AllGridItem =
    | { kind: "playlist"; item: BasePlaylistWithoutMediasResponse }
    | { kind: "album"; item: BaseAlbumWithoutSongsResponse }
    | { kind: "video"; item: BaseVideoResponse }
    | { kind: "song"; item: BaseSongWithoutAlbumResponse }
    | { kind: "station"; item: BaseStationResponse };

function interleaveGridItems(
    playlists: BasePlaylistWithoutMediasResponse[],
    albums: BaseAlbumWithoutSongsResponse[],
    videos: BaseVideoResponse[],
    songs: BaseSongWithoutAlbumResponse[],
    stations: BaseStationResponse[]
): AllGridItem[] {
    const sources: AllGridItem[][] = [
        playlists.map((p) => ({ kind: "playlist" as const, item: p })),
        albums.map((a) => ({ kind: "album" as const, item: a })),
        videos.map((v) => ({ kind: "video" as const, item: v })),
        songs.map((s) => ({ kind: "song" as const, item: s })),
        stations.map((s) => ({ kind: "station" as const, item: s })),
    ];
    const maxLen = Math.max(...sources.map((a) => a.length));
    const result: AllGridItem[] = [];
    for (let i = 0; i < maxLen; i++) {
        for (const arr of sources) {
            if (i < arr.length) result.push(arr[i]);
        }
    }
    return result;
}

/* ------------------------------------------------------- */
/* SHARED UI PRIMITIVES                                    */
/* ------------------------------------------------------- */

function SectionPlayButton({
    onClick,
    label,
}: {
    onClick: () => void;
    label: string;
}): JSX.Element {
    return (
        <button
            onClick={onClick}
            title={label}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-linear-to-r from-(--color-rockit-pink) to-(--color-rockit-pink-light) transition-transform md:hover:scale-105"
        >
            <Play className="h-1/2 w-1/2" fill="white" />
        </button>
    );
}

function SectionHeader({
    title,
    rightElement,
}: {
    title: string;
    rightElement?: ReactNode;
}): JSX.Element {
    return (
        <div className="flex items-center px-4 pt-4 pb-3">
            <h2 className="text-2xl font-bold text-balance md:text-3xl">
                {title}
            </h2>
            {rightElement && <div className="ml-4">{rightElement}</div>}
        </div>
    );
}

function EmptyState({ message }: { message: string }): JSX.Element {
    return (
        <div className="flex items-center justify-center py-16 text-neutral-500">
            <p className="text-base font-medium">{message}</p>
        </div>
    );
}

/* ------------------------------------------------------- */
/* ALL TAB — GRID (grouped by type)                        */
/* ------------------------------------------------------- */

function SectionedAllGrid({
    albums,
    playlists,
    videos,
    songs,
    stations,
}: {
    albums: BaseAlbumWithoutSongsResponse[];
    playlists: BasePlaylistWithoutMediasResponse[];
    videos: BaseVideoResponse[];
    songs: BaseSongWithoutAlbumResponse[];
    stations: BaseStationResponse[];
}): JSX.Element {
    const mixed = useMemo(
        () => interleaveGridItems(playlists, albums, videos, songs, stations),
        [playlists, albums, videos, songs, stations]
    );

    return (
        <div className={GRID_CLASS}>
            <NewPlaylistButton variant="card" />
            {mixed.map((m): JSX.Element => {
                switch (m.kind) {
                    case "playlist":
                        return (
                            <PlaylistCard
                                key={m.item.publicId}
                                playlist={m.item}
                            />
                        );
                    case "album":
                        return (
                            <AlbumCard key={m.item.publicId} album={m.item} />
                        );
                    case "video":
                        return (
                            <VideoCard key={m.item.publicId} video={m.item} />
                        );
                    case "song":
                        return <SongCard key={m.item.publicId} song={m.item} />;
                    case "station":
                        return (
                            <StationCard
                                key={m.item.publicId}
                                station={m.item}
                            />
                        );
                }
            })}
        </div>
    );
}

/**
 * "All" tab in masonry mode: all items interleaved in a masonry grid.
 */
function SectionedAllMasonry({
    albums,
    playlists,
    videos,
    songs,
    stations,
}: {
    albums: BaseAlbumWithoutSongsResponse[];
    playlists: BasePlaylistWithoutMediasResponse[];
    videos: BaseVideoResponse[];
    songs: BaseSongWithoutAlbumResponse[];
    stations: BaseStationResponse[];
}): JSX.Element {
    const mixed = useMemo(
        () => interleaveGridItems(playlists, albums, videos, songs, stations),
        [playlists, albums, videos, songs, stations]
    );

    return (
        <div className="masonry-grid px-4 pt-4 pb-4">
            <NewPlaylistButton variant="card" />
            {mixed.map((m): JSX.Element => {
                switch (m.kind) {
                    case "playlist":
                        return (
                            <PlaylistCard
                                key={m.item.publicId}
                                playlist={m.item}
                            />
                        );
                    case "album":
                        return (
                            <AlbumCard key={m.item.publicId} album={m.item} />
                        );
                    case "video":
                        return (
                            <VideoCard key={m.item.publicId} video={m.item} />
                        );
                    case "song":
                        return <SongCard key={m.item.publicId} song={m.item} />;
                    case "station":
                        return (
                            <StationCard
                                key={m.item.publicId}
                                station={m.item}
                            />
                        );
                }
            })}
        </div>
    );
}

/**
 * "All" tab in list mode: all items interleaved in a single grid of rows.
 */
function SectionedAllList({
    albums,
    playlists,
    videos,
    songs,
    stations,
}: {
    albums: BaseAlbumWithoutSongsResponse[];
    playlists: BasePlaylistWithoutMediasResponse[];
    videos: BaseVideoResponse[];
    songs: BaseSongWithoutAlbumResponse[];
    stations: BaseStationResponse[];
}): JSX.Element {
    const mixed = useMemo(
        () => interleaveGridItems(playlists, albums, videos, songs, stations),
        [playlists, albums, videos, songs, stations]
    );

    return (
        <div className={CHIP_GRID_CLASS}>
            <NewPlaylistButton variant="row" />
            {mixed.map((m): JSX.Element => {
                switch (m.kind) {
                    case "playlist":
                        return (
                            <PlaylistRow
                                key={m.item.publicId}
                                playlist={m.item}
                            />
                        );
                    case "album":
                        return (
                            <AlbumRow key={m.item.publicId} album={m.item} />
                        );
                    case "video":
                        return (
                            <VideoRow key={m.item.publicId} video={m.item} />
                        );
                    case "song":
                        return <SongRow key={m.item.publicId} song={m.item} />;
                    case "station":
                        return (
                            <StationRow
                                key={m.item.publicId}
                                station={m.item}
                            />
                        );
                }
            })}
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
}: ILibraryListsProps): JSX.Element {
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const { filtered, loading } = useLibraryData({ filterMode, searchQuery });

    const lastMonthDate = useMemo(() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        return d;
    }, []);

    const lastMonthName = new Intl.DateTimeFormat("en", {
        month: "long",
    }).format(lastMonthDate);

    const lastMonthKey = lastMonthName.toUpperCase();

    const recapImageUrl = `/recap-covers/${lastMonthName.toLowerCase()}.png`;

    const lastYear = useMemo(() => new Date().getFullYear() - 1, []);
    const lastYearDigits = String(lastYear).split("");

    const TOP_LIMIT = 5;
    const [topAlbums, setTopAlbums] = useState<
        Array<{
            publicId: string;
            name: string;
            href: string;
            imageUrl: string | null;
            subtitle: string | null;
        }>
    >([]);

    const fetchStats = useCallback(
        () => Http.getUserStats({ range: "30d", start: null, end: null }),
        []
    );

    useEffect(() => {
        fetchStats().then((res) => {
            if (res.isOk()) setTopAlbums(res.result.topAlbums);
        });
    }, [fetchStats]);

    const showAll = activeType === EContentType.All;

    const handlePlaySongs = async (): Promise<void> => {
        const songs = filtered.songs;
        if (songs.length === 0) return;
        rockIt.queueManager.setMedia(songs, "library-songs");
        rockIt.queueManager.setQueueMediaId(0);
        rockIt.mediaPlayerManager.play();
    };

    const handlePlayVideos = async (): Promise<void> => {
        const videos = filtered.videos;
        if (videos.length === 0) return;
        rockIt.queueManager.setMedia(videos, "library-videos");
        rockIt.queueManager.setQueueMediaId(0);
        rockIt.mediaPlayerManager.play();
    };

    const handlePlayAlbums = async (): Promise<void> => {
        if (filtered.albums.length === 0) return;
        const albumSongs = await expandAlbumsToPlayable(filtered.albums);
        if (albumSongs.length === 0) return;
        rockIt.queueManager.setMedia(albumSongs, "library-albums");
        rockIt.queueManager.setQueueMediaId(0);
        rockIt.mediaPlayerManager.play();
    };

    const handlePlayPlaylists = async (): Promise<void> => {
        if (filtered.playlists.length === 0) return;
        const playlistSongs = await expandPlaylistsToPlayable(
            filtered.playlists
        );
        if (playlistSongs.length === 0) return;
        rockIt.queueManager.setMedia(playlistSongs, "library-playlists");
        rockIt.queueManager.setQueueMediaId(0);
        rockIt.mediaPlayerManager.play();
    };

    if (loading) return <LoadingComponent />;

    return (
        <section>
            {/* Recommended by Rockit Section */}
            <SectionHeader title={$vocabulary.FEATURED_LISTS} />
            <div className="scrollbar-thin scrollbar-thumb-neutral-600 scrollbar-track-transparent mb-4 flex gap-4 overflow-x-auto px-4 py-2 pb-2">
                <Link
                    href="/playlist/liked"
                    className="w-40 flex-none transition duration-75 md:hover:scale-105"
                >
                    <div
                        className="relative aspect-square w-full rounded-lg bg-cover"
                        style={{
                            backgroundImage: "url(/rockit-background.png)",
                        }}
                    >
                        <Heart
                            className="absolute top-1/2 left-1/2 h-1/2 w-1/2 -translate-x-1/2 -translate-y-1/2 select-none"
                            fill="white"
                        />
                    </div>
                    <p className="mt-2 block truncate text-center font-semibold">
                        {$vocabulary.LIKED_SONGS}
                    </p>
                    <p className="block truncate text-center text-sm text-gray-400">
                        {$vocabulary.BY} Rock It!
                    </p>
                </Link>

                <Link
                    href="/playlist/most-listened"
                    className="w-40 flex-none transition duration-75 md:hover:scale-105"
                >
                    <div
                        className="relative aspect-square w-full rounded-lg bg-cover"
                        style={{
                            backgroundImage: "url(/rockit-background.png)",
                        }}
                    >
                        <Disc3 className="absolute top-1/2 left-1/2 h-1/2 w-1/2 -translate-x-1/2 -translate-y-1/2 select-none" />
                    </div>
                    <p className="mt-2 block truncate text-center font-semibold">
                        {$vocabulary.MOST_LISTENED}
                    </p>
                    <p className="block truncate text-center text-sm text-gray-400">
                        {$vocabulary.BY} Rock It!
                    </p>
                </Link>

                <Link
                    href="/playlist/recent-mix"
                    className="w-40 flex-none transition duration-75 md:hover:scale-105"
                >
                    <div
                        className="relative aspect-square w-full rounded-lg bg-cover"
                        style={{
                            backgroundImage: "url(/rockit-background.png)",
                        }}
                    >
                        <History className="absolute top-1/2 left-1/2 h-1/2 w-1/2 -translate-x-1/2 -translate-y-1/2 select-none" />
                    </div>
                    <p className="mt-2 block truncate text-center font-semibold">
                        {$vocabulary.RECENT_MIX}
                    </p>
                    <p className="block truncate text-center text-sm text-gray-400">
                        {$vocabulary.BY} Rock It!
                    </p>
                </Link>

                <Link
                    href="/playlist/year-recap"
                    className="w-40 flex-none transition duration-75 md:hover:scale-105"
                >
                    <div
                        className="relative aspect-square w-full rounded-lg bg-cover"
                        style={{
                            backgroundImage: "url(/rockit-background.png)",
                        }}
                    >
                        <div
                            className="absolute inset-0 flex items-center justify-center gap-1 text-white select-none"
                            style={{
                                fontFamily:
                                    "'Nunito', 'Segoe UI', system-ui, sans-serif",
                                fontWeight: 900,
                                fontSize: "clamp(1.2rem, 5vw, 2.5rem)",
                                letterSpacing: "-0.04em",
                            }}
                        >
                            {lastYearDigits.map((digit, i) => (
                                <span key={i}>{digit}</span>
                            ))}
                        </div>
                    </div>
                    <p className="mt-2 block truncate text-center font-semibold">
                        {lastYear} Recap
                    </p>
                    <p className="block truncate text-center text-sm text-gray-400">
                        {$vocabulary.BY} Rock It!
                    </p>
                </Link>

                <Link
                    href="/playlist/last-month"
                    className="w-40 flex-none transition duration-75 md:hover:scale-105"
                >
                    <div
                        className="relative aspect-square w-full rounded-lg bg-cover"
                        style={{
                            backgroundImage: `url(${recapImageUrl})`,
                        }}
                    />
                    <p className="mt-2 block truncate text-center font-semibold">
                        {$vocabulary[lastMonthKey as keyof typeof $vocabulary]}{" "}
                        Recap
                    </p>
                    <p className="block truncate text-center text-sm text-gray-400">
                        {$vocabulary.BY} Rock It!
                    </p>
                </Link>

                {topAlbums.slice(0, TOP_LIMIT).map((album) => (
                    <Link
                        key={album.publicId}
                        href={album.href}
                        className="w-40 flex-none transition duration-75 md:hover:scale-105"
                    >
                        <Image
                            alt={album.name}
                            src={album.imageUrl ?? "/song-placeholder.png"}
                            width={160}
                            height={160}
                            className="aspect-square w-full rounded-md object-cover select-none"
                        />
                        <p className="mt-1 truncate text-center font-semibold">
                            {album.name}
                        </p>
                        <p className="truncate text-center text-sm text-gray-400">
                            {album.subtitle}
                        </p>
                    </Link>
                ))}
            </div>

            {showAll && (
                <>
                    <SectionHeader
                        title={$vocabulary.YOUR_ALBUMS_PLAYLISTS}
                        rightElement={<PlayLibraryButton />}
                    />

                    {viewMode === EViewMode.List ? (
                        <SectionedAllList
                            albums={filtered.albums}
                            playlists={filtered.playlists}
                            videos={filtered.videos}
                            songs={filtered.songs}
                            stations={filtered.stations}
                        />
                    ) : viewMode === EViewMode.Masonry ? (
                        <SectionedAllMasonry
                            albums={filtered.albums}
                            playlists={filtered.playlists}
                            videos={filtered.videos}
                            songs={filtered.songs}
                            stations={filtered.stations}
                        />
                    ) : (
                        <SectionedAllGrid
                            albums={filtered.albums}
                            playlists={filtered.playlists}
                            videos={filtered.videos}
                            songs={filtered.songs}
                            stations={filtered.stations}
                        />
                    )}
                </>
            )}

            {/* ── ALBUMS tab ────────────────────────────────────────────── */}
            {activeType === EContentType.Albums &&
                (filtered.albums.length === 0 ? (
                    <EmptyState message={$vocabulary.NO_ALBUMS} />
                ) : (
                    <>
                        <SectionHeader
                            title={`${$vocabulary.YOUR} ${$vocabulary.ALBUMS}`}
                            rightElement={
                                <SectionPlayButton
                                    onClick={handlePlayAlbums}
                                    label="Play all albums"
                                />
                            }
                        />
                        {viewMode === EViewMode.List ? (
                            <div className={CHIP_GRID_CLASS}>
                                {filtered.albums.map(
                                    (al): JSX.Element => (
                                        <AlbumRow
                                            key={al.publicId}
                                            album={al}
                                        />
                                    )
                                )}
                            </div>
                        ) : viewMode === EViewMode.Masonry ? (
                            <div className="masonry-grid px-4 pt-4 pb-4">
                                {filtered.albums.map(
                                    (al): JSX.Element => (
                                        <AlbumCard
                                            key={al.publicId}
                                            album={al}
                                        />
                                    )
                                )}
                            </div>
                        ) : (
                            <div className={GRID_CLASS}>
                                {filtered.albums.map(
                                    (al): JSX.Element => (
                                        <AlbumCard
                                            key={al.publicId}
                                            album={al}
                                        />
                                    )
                                )}
                            </div>
                        )}
                    </>
                ))}

            {/* ── PLAYLISTS tab ─────────────────────────────────────────── */}
            {activeType === EContentType.Playlists &&
                (filtered.playlists.length === 0 ? (
                    <EmptyState message={$vocabulary.NO_PLAYLISTS} />
                ) : (
                    <>
                        <SectionHeader
                            title={`${$vocabulary.YOUR} ${$vocabulary.PLAYLISTS}`}
                            rightElement={
                                <SectionPlayButton
                                    onClick={handlePlayPlaylists}
                                    label="Play all playlists"
                                />
                            }
                        />
                        {viewMode === EViewMode.List ? (
                            <div className={CHIP_GRID_CLASS}>
                                <NewPlaylistButton variant="row" />
                                {filtered.playlists.map(
                                    (pl): JSX.Element => (
                                        <PlaylistRow
                                            key={pl.publicId}
                                            playlist={pl}
                                        />
                                    )
                                )}
                            </div>
                        ) : viewMode === EViewMode.Masonry ? (
                            <div className="masonry-grid px-4 pt-4 pb-4">
                                <NewPlaylistButton variant="card" />
                                {filtered.playlists.map(
                                    (pl): JSX.Element => (
                                        <PlaylistCard
                                            key={pl.publicId}
                                            playlist={pl}
                                        />
                                    )
                                )}
                            </div>
                        ) : (
                            <div className={GRID_CLASS}>
                                <NewPlaylistButton variant="card" />
                                {filtered.playlists.map(
                                    (pl): JSX.Element => (
                                        <PlaylistCard
                                            key={pl.publicId}
                                            playlist={pl}
                                        />
                                    )
                                )}
                            </div>
                        )}
                    </>
                ))}

            {/* ── SONGS tab ─────────────────────────────────────────────── */}
            {activeType === EContentType.Songs &&
                (filtered.songs.length === 0 ? (
                    <EmptyState message={$vocabulary.NO_SONGS} />
                ) : (
                    <>
                        <SectionHeader
                            title={`${$vocabulary.YOUR} ${$vocabulary.SONGS}`}
                            rightElement={
                                <SectionPlayButton
                                    onClick={handlePlaySongs}
                                    label="Play all songs"
                                />
                            }
                        />
                        {viewMode === EViewMode.List ? (
                            <div className={CHIP_GRID_CLASS}>
                                {filtered.songs.map(
                                    (s): JSX.Element => (
                                        <SongRow key={s.publicId} song={s} />
                                    )
                                )}
                            </div>
                        ) : viewMode === EViewMode.Masonry ? (
                            <div className="masonry-grid px-4 pt-4 pb-4">
                                {filtered.songs.map(
                                    (s): JSX.Element => (
                                        <SongCard key={s.publicId} song={s} />
                                    )
                                )}
                            </div>
                        ) : (
                            <div className={GRID_CLASS}>
                                {filtered.songs.map(
                                    (s): JSX.Element => (
                                        <SongCard key={s.publicId} song={s} />
                                    )
                                )}
                            </div>
                        )}
                    </>
                ))}

            {/* ── VIDEOS tab ────────────────────────────────────────────── */}
            {activeType === EContentType.Videos &&
                (filtered.videos.length === 0 ? (
                    <EmptyState message={$vocabulary.NO_VIDEOS} />
                ) : (
                    <>
                        <SectionHeader
                            title={`${$vocabulary.YOUR} ${$vocabulary.VIDEOS}`}
                            rightElement={
                                <SectionPlayButton
                                    onClick={handlePlayVideos}
                                    label="Play all videos"
                                />
                            }
                        />
                        {viewMode === EViewMode.List ? (
                            <div className={CHIP_GRID_CLASS}>
                                {filtered.videos.map(
                                    (v): JSX.Element => (
                                        <VideoRow key={v.publicId} video={v} />
                                    )
                                )}
                            </div>
                        ) : viewMode === EViewMode.Masonry ? (
                            <div className="masonry-grid px-4 pt-4 pb-4">
                                {filtered.videos.map(
                                    (v): JSX.Element => (
                                        <VideoCard key={v.publicId} video={v} />
                                    )
                                )}
                            </div>
                        ) : (
                            <div className={GRID_CLASS}>
                                {filtered.videos.map(
                                    (v): JSX.Element => (
                                        <VideoCard key={v.publicId} video={v} />
                                    )
                                )}
                            </div>
                        )}
                    </>
                ))}

            {/* ── STATIONS tab ──────────────────────────────────────────── */}
            {activeType === EContentType.Stations &&
                (filtered.stations.length === 0 ? (
                    <EmptyState message={$vocabulary.NO_STATIONS} />
                ) : (
                    <>
                        <SectionHeader
                            title={`${$vocabulary.YOUR} ${$vocabulary.RADIO_STATIONS}`}
                        />
                        {viewMode === EViewMode.List ? (
                            <div className={CHIP_GRID_CLASS}>
                                {filtered.stations.map(
                                    (st): JSX.Element => (
                                        <StationRow
                                            key={st.publicId}
                                            station={st}
                                        />
                                    )
                                )}
                            </div>
                        ) : viewMode === EViewMode.Masonry ? (
                            <div className="masonry-grid px-4 pt-4 pb-4">
                                {filtered.stations.map(
                                    (st): JSX.Element => (
                                        <StationCard
                                            key={st.publicId}
                                            station={st}
                                        />
                                    )
                                )}
                            </div>
                        ) : (
                            <div className={GRID_CLASS}>
                                {filtered.stations.map(
                                    (st): JSX.Element => (
                                        <StationCard
                                            key={st.publicId}
                                            station={st}
                                        />
                                    )
                                )}
                            </div>
                        )}
                    </>
                ))}
        </section>
    );
}
