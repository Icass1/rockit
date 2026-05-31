"use client";

import { ReactNode, useCallback, useEffect, useMemo, useState, type JSX } from "react";
import {
    BaseAlbumWithoutSongsResponse,
    BasePlaylistWithoutMediasResponse,
    BaseSongWithoutAlbumResponse,
    BaseStationResponse,
    BaseVideoResponse,
} from "@/dto";
import { useStore } from "@nanostores/react";
import { EContentKind } from "@/models/enums/contentKind";
import { EContentType } from "@/models/enums/contentType";
import { EViewMode } from "@/models/enums/viewMode";
import { ILibraryListsProps } from "@/models/interfaces/library";
import { ILibraryMasonryItem } from "@/models/types/masonryItem";
import { rockIt } from "@/lib/rockit/rockIt";
import { Http } from "@/lib/http";
import { useLibraryData } from "@/components/Library/hooks/useLibraryData";
import {
    AlbumCard,
    PlaylistCard,
    SongCard,
    StationCard,
    VideoCard,
} from "@/components/Library/LibraryCards";
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
import Link from "next/link";
import Image from "next/image";
import { Heart, Disc3, History } from "lucide-react";

/* ------------------------------------------------------- */
/* LAYOUT CONSTANTS                                        */
/* ------------------------------------------------------- */

const GRID_CLASS =
    "grid grid-cols-[repeat(auto-fit,_minmax(250px,1fr))] gap-x-4 gap-y-5 px-4 py-4";

const ROW_LIST_CLASS = "flex flex-col px-4";

const MASONRY_CLASS =
    "grid grid-cols-[repeat(auto-fit,_minmax(250px,1fr))] gap-4 gap-x-4 gap-y-5 px-4 py-4";

/* ------------------------------------------------------- */
/* SHARED UI PRIMITIVES                                    */
/* ------------------------------------------------------- */

function SectionHeader({
    title,
    rightElement,
}: {
    title: string;
    rightElement?: ReactNode;
}): JSX.Element {
    return (
        <div className="flex items-center px-4 pt-4 pb-3">
            <h2 className="text-3xl font-bold">{title}</h2>
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
/* MASONRY — ERepeatMode.ALL TAB                                     */
/* ------------------------------------------------------- */

function MasonryAllGrid({
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
}): JSX.Element | null {
    const items = useMemo<ILibraryMasonryItem[]>((): ILibraryMasonryItem[] => {
        const buckets: ILibraryMasonryItem[][] = [
            albums.map(
                (d): ILibraryMasonryItem => ({
                    kind: EContentKind.ALBUM,
                    data: d,
                })
            ),
            playlists.map(
                (d): ILibraryMasonryItem => ({
                    kind: EContentKind.PLAYLIST,
                    data: d,
                })
            ),
            videos.map(
                (d): ILibraryMasonryItem => ({
                    kind: EContentKind.VIDEO,
                    data: d,
                })
            ),
            songs.map(
                (d): ILibraryMasonryItem => ({
                    kind: EContentKind.SONG,
                    data: d,
                })
            ),
            stations.map(
                (d): ILibraryMasonryItem => ({
                    kind: EContentKind.STATION,
                    data: {
                        type: "station",
                        provider: d.provider,
                        publicId: d.publicId,
                        providerUrl: d.providerUrl,
                        name: d.name,
                        imageUrl: d.imageUrl,
                    },
                })
            ),
        ];

        const result: ILibraryMasonryItem[] = [];
        const maxLen = Math.max(...buckets.map((b): number => b.length));

        for (let i = 0; i < maxLen; i++) {
            for (const bucket of buckets) {
                if (i < bucket.length) result.push(bucket[i]);
            }
        }

        return result;
    }, [albums, playlists, videos, songs, stations]);

    return (
        <div className={MASONRY_CLASS}>
            <div className="break-inside-avoid mb-4">
                <NewPlaylistButton />
            </div>
            {items.map((item): JSX.Element | undefined => {
                const wrapClass = "break-inside-avoid mb-4";

                switch (item.kind) {
                    case EContentKind.ALBUM:
                        return (
                            <div
                                key={`album-${item.data.publicId}`}
                                className={wrapClass}
                            >
                                <AlbumCard album={item.data} />
                            </div>
                        );
                    case EContentKind.PLAYLIST:
                        return (
                            <div
                                key={`playlist-${item.data.publicId}`}
                                className={wrapClass}
                            >
                                <PlaylistCard playlist={item.data} />
                            </div>
                        );
                    case EContentKind.VIDEO:
                        return (
                            <div
                                key={`video-${item.data.publicId}`}
                                className={wrapClass}
                            >
                                <VideoCard video={item.data} />
                            </div>
                        );
                    case EContentKind.SONG:
                        return (
                            <div
                                key={`song-${item.data.publicId}`}
                                className={wrapClass}
                            >
                                <SongCard song={item.data} />
                            </div>
                        );
                    case EContentKind.STATION:
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
    playlists: BasePlaylistWithoutMediasResponse[];
    videos: BaseVideoResponse[];
    songs: BaseSongWithoutAlbumResponse[];
    stations: BaseStationResponse[];
}): JSX.Element {
    return (
        <div>
            {playlists.length > 0 && (
                <section>
                    <SectionHeader title="PLAYLISTS" />
                    <div className={ROW_LIST_CLASS}>
                        {playlists.map(
                            (pl): JSX.Element => (
                                <PlaylistRow key={pl.publicId} playlist={pl} />
                            )
                        )}
                    </div>
                </section>
            )}

            {albums.length > 0 && (
                <section>
                    <SectionHeader title="ALBUMS" />
                    <div className={ROW_LIST_CLASS}>
                        {albums.map(
                            (al): JSX.Element => (
                                <AlbumRow key={al.publicId} album={al} />
                            )
                        )}
                    </div>
                </section>
            )}

            {songs.length > 0 && (
                <section>
                    <SectionHeader title="SONGS" />
                    <div className={ROW_LIST_CLASS}>
                        {songs.map(
                            (s): JSX.Element => (
                                <SongRow key={s.publicId} song={s} />
                            )
                        )}
                    </div>
                </section>
            )}

            {videos.length > 0 && (
                <section>
                    <SectionHeader title="VIDEOS" />
                    <div className={ROW_LIST_CLASS}>
                        {videos.map(
                            (v): JSX.Element => (
                                <VideoRow key={v.publicId} video={v} />
                            )
                        )}
                    </div>
                </section>
            )}

            {stations.length > 0 && (
                <section>
                    <SectionHeader title="RADIO_STATIONS" />
                    <div className={ROW_LIST_CLASS}>
                        {stations.map(
                            (st): JSX.Element => (
                                <StationRow key={st.publicId} station={st} />
                            )
                        )}
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

    const TOP_LIMIT = 10;
    const [topAlbums, setTopAlbums] = useState<Array<{ publicId: string; name: string; href: string; imageUrl: string | null; subtitle: string | null }>>([]);

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

    if (loading) return <LoadingComponent />;

    return (
        <section>
            {/* Recommended by Rockit Section */}
            <SectionHeader title={$vocabulary.FEATURED_LISTS} />
            <div className="flex gap-4 px-4 overflow-x-auto scrollbar-thin scrollbar-thumb-neutral-600 scrollbar-track-transparent py-2 pb-2 mb-4">
                <Link
                    href="/playlist/liked"
                    className="flex-none w-40 transition duration-75 md:hover:scale-105"
                >
                    <div
                        className="relative aspect-square w-full rounded-lg bg-cover"
                        style={{
                            backgroundImage:
                                "url(/rockit-background.png)",
                        }}
                    >
                        <Heart
                            className="absolute top-1/2 left-1/2 h-1/2 w-1/2 -translate-x-1/2 -translate-y-1/2"
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
                    className="flex-none w-40 transition duration-75 md:hover:scale-105"
                >
                    <div
                        className="relative aspect-square w-full rounded-lg bg-cover"
                        style={{
                            backgroundImage:
                                "url(/rockit-background.png)",
                        }}
                    >
                        <Disc3 className="absolute top-1/2 left-1/2 h-1/2 w-1/2 -translate-x-1/2 -translate-y-1/2" />
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
                    className="flex-none w-40 transition duration-75 md:hover:scale-105"
                >
                    <div
                        className="relative aspect-square w-full rounded-lg bg-cover"
                        style={{
                            backgroundImage:
                                "url(/rockit-background.png)",
                        }}
                    >
                        <History className="absolute top-1/2 left-1/2 h-1/2 w-1/2 -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <p className="mt-2 block truncate text-center font-semibold">
                        {$vocabulary.RECENT_MIX}
                    </p>
                    <p className="block truncate text-center text-sm text-gray-400">
                        {$vocabulary.BY} Rock It!
                    </p>
                </Link>

                <Link
                    href="/playlist/last-month"
                    className="flex-none w-40 transition duration-75 md:hover:scale-105"
                >
                    <div
                        className="relative aspect-square w-full rounded-lg bg-cover"
                        style={{
                            backgroundImage: `url(${recapImageUrl})`,
                        }}
                    />
                    <p className="mt-2 block truncate text-center font-semibold">
                        {$vocabulary[lastMonthKey as keyof typeof $vocabulary]} Recap
                    </p>
                    <p className="block truncate text-center text-sm text-gray-400">
                        {$vocabulary.BY} Rock It!
                    </p>
                </Link>

                {topAlbums.slice(0, TOP_LIMIT).map((album) => (
                    <Link
                        key={album.publicId}
                        href={album.href}
                        className="flex-none w-40 transition duration-75 md:hover:scale-105"
                    >
                        <Image
                            alt={album.name}
                            src={album.imageUrl ?? "/song-placeholder.png"}
                            width={160}
                            height={160}
                            className="aspect-square w-full rounded-md object-cover"
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
                    ) : (
                        <MasonryAllGrid
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
                ) : viewMode === EViewMode.List ? (
                    <AlbumListView albums={filtered.albums} />
                ) : (
                    <div className={GRID_CLASS}>
                        {filtered.albums.map(
                            (al): JSX.Element => (
                                <AlbumCard key={al.publicId} album={al} />
                            )
                        )}
                    </div>
                ))}

            {/* ── PLAYLISTS tab ─────────────────────────────────────────── */}
            {activeType === EContentType.Playlists &&
                (filtered.playlists.length === 0 ? (
                    <EmptyState message={$vocabulary.NO_PLAYLISTS} />
                ) : viewMode === EViewMode.List ? (
                    <div className={ROW_LIST_CLASS}>
                        {filtered.playlists.map(
                            (pl): JSX.Element => (
                                <PlaylistRow key={pl.publicId} playlist={pl} />
                            )
                        )}
                    </div>
                ) : (
                    <div className={GRID_CLASS}>
                        <NewPlaylistButton />
                        {filtered.playlists.map(
                            (pl): JSX.Element => (
                                <PlaylistCard key={pl.publicId} playlist={pl} />
                            )
                        )}
                    </div>
                ))}

            {/* ── SONGS (always rows — grid adds nothing for songs) ─────── */}
            {activeType === EContentType.Songs &&
                (filtered.songs.length === 0 ? (
                    <EmptyState message={$vocabulary.NO_SONGS} />
                ) : (
                    <div className={ROW_LIST_CLASS}>
                        {filtered.songs.map(
                            (s): JSX.Element => (
                                <SongRow key={s.publicId} song={s} />
                            )
                        )}
                    </div>
                ))}

            {/* ── VIDEOS tab ────────────────────────────────────────────── */}
            {activeType === EContentType.Videos &&
                (filtered.videos.length === 0 ? (
                    <EmptyState message={$vocabulary.NO_VIDEOS} />
                ) : viewMode === EViewMode.List ? (
                    <div className={ROW_LIST_CLASS}>
                        {filtered.videos.map(
                            (v): JSX.Element => (
                                <VideoRow key={v.publicId} video={v} />
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
                ))}

            {/* ── STATIONS (always rows) ────────────────────────────────── */}
            {activeType === EContentType.Stations &&
                (filtered.stations.length === 0 ? (
                    <EmptyState message={$vocabulary.NO_STATIONS} />
                ) : (
                    <div className={ROW_LIST_CLASS}>
                        {filtered.stations.map(
                            (st): JSX.Element => (
                                <StationRow key={st.publicId} station={st} />
                            )
                        )}
                    </div>
                ))}
        </section>
    );
}
