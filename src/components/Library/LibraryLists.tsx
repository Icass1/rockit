"use client";

import { useEffect, useMemo, useState } from "react";
import { PlaylistDB } from "@/lib/db/playlist";
import { AlbumDB } from "@/lib/db/album";
import { useStore } from "@nanostores/react";
import { langData } from "@/stores/lang";
import useWindowSize from "@/hooks/useWindowSize";
import useFetch from "@/hooks/useFetch";
import { libraryLists } from "@/stores/libraryLists";
import PlayLibraryButton from "./PlayLibraryButton";
import { useSession } from "next-auth/react";
import ToggleLayoutButton from "./ToggleLayoutButton";
import { GridLayout } from "./GridLayout";
import { ByArtistLayout } from "./ByArtistLayout";

function Layout({
    libraryView,
    filteredAlbums,
    filteredPlaylists,
}: {
    libraryView: "grid" | "byArtist";
    filteredAlbums: AlbumDB[];
    filteredPlaylists: PlaylistDB[];
}) {
    if (libraryView === "grid") {
        return (
            <GridLayout
                filteredAlbums={filteredAlbums}
                filteredPlaylists={filteredPlaylists}
            />
        );
    } else if (libraryView === "byArtist") {
        return (
            <ByArtistLayout
                filteredAlbums={filteredAlbums}
                filteredPlaylists={filteredPlaylists}
            />
        );
    }
}

export function LibraryLists({
    filterMode,
    searchQuery,
}: {
    filterMode: "default" | "asc" | "desc";
    searchQuery: string;
}) {
    const { width } = useWindowSize();
    const $lang = useStore(langData);

    const [data, updateLists] = useFetch<{
        playlists: PlaylistDB[];
        albums: AlbumDB[];
    }>("/api/library/lists");

    useEffect(() => {
        return libraryLists.listen(() => {
            updateLists();
        });
    }, [updateLists]);

    const playlists = data?.playlists;
    const albums = data?.albums;

    const session = useSession();

    const [libraryView, setLibraryView] = useState<
        "grid" | "byArtist" | undefined
    >();

    useEffect(() => {
        if (session.status === "authenticated") {
            setLibraryView(session.data.user.libraryView || "grid");
        } else {
            setLibraryView("grid");
        }
    }, [session.status, session.data]);

    const filteredPlaylists = useMemo(() => {
        if (!playlists) return;

        let result = playlists.filter((pl) =>
            pl.name.toLowerCase().includes(searchQuery.toLowerCase())
        );

        if (filterMode === "asc") {
            result = result.sort((a, b) => a.name.localeCompare(b.name));
        } else if (filterMode === "desc") {
            result = result.sort((a, b) => b.name.localeCompare(a.name));
        }

        return result;
    }, [playlists, filterMode, searchQuery]);

    const filteredAlbums = useMemo(() => {
        if (!albums) return;

        let result = albums.filter((al) => {
            const matchesName = al.name
                .toLowerCase()
                .includes(searchQuery.toLowerCase());
            const matchesArtist = al.artists.some((artist) =>
                artist.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
            return matchesName || matchesArtist;
        });

        if (filterMode === "asc") {
            result = result.sort((a, b) => a.name.localeCompare(b.name));
        } else if (filterMode === "desc") {
            result = result.sort((a, b) => b.name.localeCompare(a.name));
        }

        return result;
    }, [albums, filterMode, searchQuery]);

    if (
        !width ||
        !$lang ||
        !filteredPlaylists ||
        !filteredAlbums ||
        !libraryView
    )
        return null;

    return (
        <section>
            <div className="flex flex-row items-center justify-between px-5 py-4 md:px-0">
                <h2 className="text-2xl font-bold">
                    {$lang.your_albums_playlists}
                </h2>
                <div className="flex flex-row gap-2">
                    <ToggleLayoutButton
                        setLibraryView={setLibraryView}
                        libraryView={libraryView}
                    />
                    <PlayLibraryButton />
                </div>
            </div>

            <Layout
                libraryView={libraryView}
                filteredAlbums={filteredAlbums}
                filteredPlaylists={filteredPlaylists}
            />

            <div className="min-h-10" />
        </section>
    );
}
