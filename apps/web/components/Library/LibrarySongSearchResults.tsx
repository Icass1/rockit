"use client";

import { useMemo, type JSX } from "react";
import { useStore } from "@nanostores/react";
import {
    EMediaContextLocation,
    type BaseSongWithAlbumResponse,
} from "@rockit/shared";
import { LoaderCircle } from "lucide-react";
import { EFilterMode } from "@/models/enums/filterMode";
import { EViewMode } from "@/models/enums/viewMode";
import { rockIt } from "@/lib/rockit/rockIt";
import { useLibrarySongSearch } from "@/components/Library/hooks/useLibrarySongSearch";
import { SongCard } from "@/components/Library/LibraryCards";
import { SongRow } from "@/components/Library/LibraryRows";

export function LibrarySongSearchResults({
    query,
    filterMode,
    viewMode,
    directSongs,
    librarySongIds,
}: {
    query: string;
    filterMode: EFilterMode;
    viewMode: EViewMode;
    directSongs: BaseSongWithAlbumResponse[];
    librarySongIds: string[];
}): JSX.Element {
    const vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const search = useLibrarySongSearch(query, filterMode, true);
    const direct = useMemo(() => new Set(librarySongIds), [librarySongIds]);
    // An unavailable server is not an empty Library. Keep already known direct
    // matches usable, but explicitly state that collection search is incomplete.
    const songs =
        search.error && search.songs.length === 0 ? directSongs : search.songs;
    const list = viewMode === EViewMode.List;
    return (
        <section
            aria-label={vocabulary.SONGS}
            className="pb-4"
            aria-busy={search.loading}
        >
            <div className="px-4 pt-4 pb-3">
                <h2 className="text-2xl font-bold md:text-3xl">
                    {vocabulary.SONGS}
                </h2>
                <p className="mt-1 text-sm text-neutral-400">
                    {vocabulary.LIBRARY_SONG_SEARCH_HINT}
                </p>
            </div>
            <div
                className={
                    list
                        ? "grid grid-cols-1 gap-1 px-4 md:grid-cols-[repeat(auto-fill,minmax(280px,1fr))]"
                        : viewMode === EViewMode.Masonry
                          ? "masonry-grid px-4 pt-4 pb-4"
                          : "grid grid-cols-2 gap-x-3 gap-y-4 px-4 py-4 md:grid-cols-[repeat(auto-fill,250px)] md:gap-4"
                }
            >
                {songs.map((song) =>
                    list ? (
                        <SongRow
                            key={song.publicId}
                            song={song}
                            albumName={song.album.name}
                            location={
                                direct.has(song.publicId)
                                    ? EMediaContextLocation.LIBRARY
                                    : EMediaContextLocation.HOME
                            }
                        />
                    ) : (
                        <SongCard
                            key={song.publicId}
                            song={song}
                            albumName={song.album.name}
                            location={
                                direct.has(song.publicId)
                                    ? EMediaContextLocation.LIBRARY
                                    : EMediaContextLocation.HOME
                            }
                        />
                    )
                )}
            </div>
            <div
                className="px-4 py-3 text-sm text-neutral-300"
                role="status"
                aria-live="polite"
            >
                {search.loading ? (
                    <span className="flex items-center gap-2">
                        <LoaderCircle
                            className="h-4 w-4 animate-spin motion-reduce:animate-none"
                            aria-hidden
                        />
                        {vocabulary.SEARCH_LOADING}
                    </span>
                ) : search.error ? (
                    <p>{vocabulary.LIBRARY_SONG_SEARCH_INCOMPLETE}</p>
                ) : songs.length === 0 ? (
                    <p>{vocabulary.SEARCH_NO_RESULTS}</p>
                ) : (
                    <p>
                        {search.total} {vocabulary.SONGS}
                    </p>
                )}
            </div>
            {(search.error || search.hasMore) && (
                <button
                    type="button"
                    disabled={search.loading}
                    onClick={search.error ? search.retry : search.loadMore}
                    className="mx-4 min-h-11 rounded-full bg-neutral-800 px-5 py-2 text-sm font-semibold text-white hover:bg-neutral-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-rockit-pink) disabled:opacity-50"
                >
                    {search.error
                        ? vocabulary.RETRY
                        : vocabulary.SEARCH_LOAD_MORE}
                </button>
            )}
        </section>
    );
}
