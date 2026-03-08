"use client";

import Image from "next/image";
import Link from "next/link";
import { ReactNode } from "react";
import {
    BaseAlbumWithoutSongsResponse,
    BasePlaylistResponse,
    BaseSongWithoutAlbumResponse,
    BaseVideoResponse,
} from "@/dto";
import { useStore } from "@nanostores/react";
import {
    HardDriveDownload,
    Library,
    ListEnd,
    ListStart,
    PinIcon,
    PinOff,
    PlayCircle,
    Shuffle,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { rockIt } from "@/lib/rockit/rockIt";
import ContextMenuContent from "@/components/ContextMenu/Content";
import ContextMenu from "@/components/ContextMenu/ContextMenu";
import ContextMenuOption from "@/components/ContextMenu/Option";
import ContextMenuSplitter from "@/components/ContextMenu/Splitter";
import ContextMenuTrigger from "@/components/ContextMenu/Trigger";
import NewPlaylistButton from "@/components/Library/NewPlaylistButton";
import PlayLibraryButton from "@/components/Library/PlayLibraryButton";
import LoadingComponent from "@/components/Loading";
import {
    ContentType,
    FilterMode,
    useLibraryData,
} from "@/components/Library/hooks/useLibraryData";
import { ViewMode } from "@/components/Library/LibraryFilters";

interface LibraryListsProps {
    filterMode: FilterMode;
    searchQuery: string;
    activeType: ContentType;
    viewMode: ViewMode;
}

// ─── Grid class helpers ───────────────────────────────────────────────────────
// No useWindowSize — pure CSS responsive. Avoids SSR layout shift.

function albumsGridClass(viewMode: ViewMode) {
    if (viewMode === "list") {
        return "grid grid-cols-2 gap-x-5 gap-y-3 px-5 md:grid-cols-[repeat(auto-fill,minmax(160px,1fr))]";
    }
    return "grid grid-cols-2 gap-x-5 gap-y-3 px-5 md:grid-cols-[repeat(auto-fill,minmax(180px,1fr))]";
}

function videosGridClass(viewMode: ViewMode) {
    if (viewMode === "list") {
        return "grid grid-cols-2 gap-x-5 gap-y-3 px-5 md:grid-cols-[repeat(auto-fill,minmax(200px,1fr))]";
    }
    return "grid grid-cols-2 gap-x-5 gap-y-3 px-5 md:grid-cols-[repeat(auto-fill,minmax(280px,1fr))]";
}

function songsListClass() {
    // Songs and stations are always row-based
    return "flex flex-col px-5";
}

// ─── Small components ─────────────────────────────────────────────────────────

function SectionHeader({ title, rightElement }: { title: string; rightElement?: ReactNode }) {
    return (
        <div className="flex items-center justify-between px-5 pb-3 pt-4 md:px-0">
            <h2 className="text-2xl font-bold">{title}</h2>
            {rightElement}
        </div>
    );
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-16 text-center text-neutral-500">
            <p className="text-base font-medium">{message}</p>
        </div>
    );
}

// ─── Context menu (unchanged logic) ──────────────────────────────────────────

function AddListContextMenu({
    children,
    list,
}: {
    children: ReactNode;
    list: BasePlaylistResponse | BaseAlbumWithoutSongsResponse;
}) {
    const $pinnedLists = useStore(rockIt.listManager.pinnedListsAtom);
    const isPinned = $pinnedLists.find(
        (_list) => _list.publicId === list.publicId
    );
    const { langFile: lang } = useLanguage();

    return (
        <ContextMenu>
            <ContextMenuTrigger>{children}</ContextMenuTrigger>
            <ContextMenuContent>
                <ContextMenuOption
                    onClick={() =>
                        rockIt.listManager.playAsync(list.type, list.publicId)
                    }
                >
                    <PlayCircle className="h-5 w-5" />
                    {lang?.play_list ?? "Play list"}
                </ContextMenuOption>
                <ContextMenuSplitter />
                <ContextMenuOption
                    onClick={() =>
                        rockIt.queueManager.addListToTopAsync(
                            list.type,
                            list.publicId
                        )
                    }
                >
                    <ListStart className="h-5 w-5" />
                    {lang?.add_list_to_queue ?? "Add list to top of queue"}
                </ContextMenuOption>
                <ContextMenuOption
                    onClick={() =>
                        rockIt.queueManager.addListRandomAsync(
                            list.type,
                            list.publicId
                        )
                    }
                >
                    <Shuffle className="h-5 w-5" />
                    {lang?.add_list_randomly ?? "Add list to queue randomly"}
                </ContextMenuOption>
                <ContextMenuOption
                    onClick={() =>
                        rockIt.queueManager.addListToBottomAsync(
                            list.type,
                            list.publicId
                        )
                    }
                >
                    <ListEnd className="h-5 w-5" />
                    {lang?.add_list_to_bottom ?? "Add list to bottom of queue"}
                </ContextMenuOption>
                <ContextMenuSplitter />
                <ContextMenuOption
                    onClick={() =>
                        rockIt.listManager.removeListFromLibraryAsync(
                            list.type,
                            list.publicId
                        )
                    }
                >
                    <Library className="h-5 w-5" />
                    {lang?.remove_from_library ?? "Remove from library"}
                </ContextMenuOption>
                {isPinned ? (
                    <ContextMenuOption
                        onClick={() =>
                            rockIt.listManager.unPinListAsync(
                                list.type,
                                list.publicId
                            )
                        }
                    >
                        <PinOff className="h-5 w-5" />
                        {lang?.unpin ?? "Unpin"}
                    </ContextMenuOption>
                ) : (
                    <ContextMenuOption
                        onClick={() =>
                            rockIt.listManager.pinListAsync(
                                list.type,
                                list.publicId
                            )
                        }
                    >
                        <PinIcon className="h-5 w-5" />
                        {lang?.pin ?? "Pin"}
                    </ContextMenuOption>
                )}
                <ContextMenuSplitter />
                <ContextMenuOption
                    onClick={() =>
                        rockIt.listManager.downloadListToDeviceAsync(
                            list.type,
                            list.publicId
                        )
                    }
                >
                    <HardDriveDownload className="h-5 w-5" />
                    {lang?.download_list_to_device ?? "Download list to device"}
                </ContextMenuOption>
                {list.type === "album" && (
                    <ContextMenuOption
                        onClick={() =>
                            rockIt.listManager.downloadListZipAsync(
                                list.type,
                                list.publicId
                            )
                        }
                    >
                        <HardDriveDownload className="h-5 w-5" />
                        {lang?.download_zip ?? "Download ZIP"}
                    </ContextMenuOption>
                )}
            </ContextMenuContent>
        </ContextMenu>
    );
}

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

function VideoCard({ video }: { video: BaseVideoResponse }) {
    const handlePlay = () => {
        // TODO: implement video playback from library
    };

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

function StationRow({ station }: { station: BaseSongWithoutAlbumResponse }) {
    const handlePlay = () => {
        // TODO: implement station playback from library
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
                        station.internalImageUrl ??
                        rockIt.STATION_PLACEHOLDER_IMAGE_URL
                    }
                    alt={station.name}
                    fill
                    className="object-cover"
                />
            </div>
            <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-white">
                    {station.name}
                </p>
                <p className="truncate text-sm text-neutral-400">
                    Radio Station
                </p>
            </div>
        </div>
    );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function LibraryLists({
    filterMode,
    searchQuery,
    activeType,
    viewMode,
}: LibraryListsProps) {
    const { langFile: lang } = useLanguage();
    const { filtered, loading } = useLibraryData({ filterMode, searchQuery });

    if (loading || !lang) return <LoadingComponent />;

    const showAll = activeType === "all";

    // ── Combined Albums + Playlists section (used in "all" view only) ──────────
    const renderCombinedSection = () => {
        const hasContent =
            filtered.albums.length > 0 || filtered.playlists.length > 0;

        return (
            <section>
                <SectionHeader 
                    title={lang.your_albums_playlists} 
                    rightElement={hasContent ? <PlayLibraryButton /> : undefined}
                />
                {hasContent ? (
                    <div className={albumsGridClass(viewMode)}>
                        <NewPlaylistButton />
                        {filtered.playlists.map((playlist) => (
                            <PlaylistCard
                                key={playlist.publicId}
                                playlist={playlist}
                            />
                        ))}
                        {filtered.albums.map((album) => (
                            <AlbumCard key={album.publicId} album={album} />
                        ))}
                    </div>
                ) : (
                    <div className={albumsGridClass(viewMode)}>
                        <NewPlaylistButton />
                        {searchQuery && (
                            <EmptyState
                                message={`${lang.no_results ?? "No results"}: "${searchQuery}"`}
                            />
                        )}
                    </div>
                )}
                <div className="min-h-10" />
            </section>
        );
    };

    // ── Albums only (activeType === "albums") ──────────────────────────────────
    const renderAlbumsOnly = () => {
        if (filtered.albums.length === 0) {
            return (
                <EmptyState
                    message={
                        searchQuery
                            ? `${lang.no_results ?? "No results"}: "${searchQuery}"`
                            : (lang.no_albums ?? "No albums in your library yet")
                    }
                />
            );
        }
        return (
            <section>
                <div className={albumsGridClass(viewMode)}>
                    {filtered.albums.map((album) => (
                        <AlbumCard key={album.publicId} album={album} />
                    ))}
                </div>
                <div className="min-h-10" />
            </section>
        );
    };

    // ── Playlists only (activeType === "playlists") ────────────────────────────
    const renderPlaylistsOnly = () => {
        return (
            <section>
                <div className={albumsGridClass(viewMode)}>
                    <NewPlaylistButton />
                    {filtered.playlists.map((playlist) => (
                        <PlaylistCard
                            key={playlist.publicId}
                            playlist={playlist}
                        />
                    ))}
                    {filtered.playlists.length === 0 && searchQuery && (
                        <EmptyState
                            message={`${lang.no_results ?? "No results"}: "${searchQuery}"`}
                        />
                    )}
                </div>
                <div className="min-h-10" />
            </section>
        );
    };

    // ── Songs ──────────────────────────────────────────────────────────────────
    const renderSongsSection = () => {
        if (filtered.songs.length === 0) {
            if (!showAll) {
                return (
                    <EmptyState
                        message={
                            searchQuery
                                ? `${lang.no_results ?? "No results"}: "${searchQuery}"`
                                : (lang.no_songs ?? "No songs in your library yet")
                        }
                    />
                );
            }
            return null;
        }
        return (
            <section>
                {showAll && <SectionHeader title={lang.songs} />}
                <div className={songsListClass()}>
                    {filtered.songs.map((song) => (
                        <SongRow key={song.publicId} song={song} />
                    ))}
                </div>
                <div className="min-h-10" />
            </section>
        );
    };

    // ── Videos ────────────────────────────────────────────────────────────────
    const renderVideosSection = () => {
        if (filtered.videos.length === 0) {
            if (!showAll) {
                return (
                    <EmptyState
                        message={
                            searchQuery
                                ? `${lang.no_results ?? "No results"}: "${searchQuery}"`
                                : (lang.no_videos ?? "No videos in your library yet")
                        }
                    />
                );
            }
            return null;
        }
        return (
            <section>
                {showAll && <SectionHeader title={lang.yt_videos} />}
                <div className={videosGridClass(viewMode)}>
                    {filtered.videos.map((video) => (
                        <VideoCard key={video.publicId} video={video} />
                    ))}
                </div>
                <div className="min-h-10" />
            </section>
        );
    };

    // ── Stations ──────────────────────────────────────────────────────────────
    const renderStationsSection = () => {
        if (filtered.stations.length === 0) {
            if (!showAll) {
                return (
                    <EmptyState
                        message={
                            searchQuery
                                ? `${lang.no_results ?? "No results"}: "${searchQuery}"`
                                : (lang.no_stations ?? "No stations in your library yet")
                        }
                    />
                );
            }
            return null;
        }
        return (
            <section>
                {showAll && <SectionHeader title={lang.radio_stations} />}
                <div className={songsListClass()}>
                    {filtered.stations.map((station) => (
                        <StationRow key={station.publicId} station={station} />
                    ))}
                </div>
                <div className="min-h-10" />
            </section>
        );
    };

    // ── Root render ───────────────────────────────────────────────────────────

    return (
        <section>
            {showAll && renderCombinedSection()}
            {activeType === "albums" && renderAlbumsOnly()}
            {activeType === "playlists" && renderPlaylistsOnly()}

            {(activeType === "songs" || showAll) && renderSongsSection()}
            {(activeType === "videos" || showAll) && renderVideosSection()}
            {(activeType === "stations" || showAll) && renderStationsSection()}
        </section>
    );
}