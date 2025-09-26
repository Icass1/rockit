import SearchBar from "@/components/Search/SearchBar";
import { useLanguage } from "@/contexts/LanguageContext";
import { rockitIt } from "@/lib/rockit";
import { getBestImage } from "@/lib/utils/getBestImage";
import { RockItAlbum, RockItSong } from "@/types/rockIt";
import { useStore } from "@nanostores/react";
import Image from "next/image";
import Link from "next/link";

function AlbumsSection({ spotifyAlbums }: { spotifyAlbums: RockItAlbum[] }) {
    const lang = useLanguage();
    if (!lang) return false;
    return (
        <section className="py-2 text-white md:py-6 md:pl-12">
            <h2 className="px-5 text-left text-2xl font-bold md:px-0 md:text-3xl">
                {lang.albums}
            </h2>
            <div className="relative flex items-center gap-4 overflow-x-auto px-8 py-4 md:pr-14 md:pl-4">
                {spotifyAlbums?.map((album) => (
                    <Link
                        href={`/album/${album.publicId}`}
                        className="w-36 flex-none transition md:w-48 md:hover:scale-105"
                        key={"album" + album.publicId}
                    >
                        <Image
                            width={
                                getBestImage(album.externalImages)?.width ?? 350
                            }
                            height={
                                getBestImage(album.externalImages)?.height ??
                                350
                            }
                            className="aspect-square w-full rounded-lg object-cover"
                            src={
                                getBestImage(album.externalImages)?.url ||
                                "/song-placeholder.png"
                            }
                            alt="Song Cover"
                        />
                        <label className="mt-2 block truncate text-center font-semibold">
                            {album.name}
                        </label>
                        <label className="block truncate text-center text-sm text-gray-400">
                            {album.artists.map((artist, index) => (
                                <label
                                    key={album.publicId + artist.publicId}
                                    className="md:hover:underline"
                                    onClick={(event) => {
                                        event.preventDefault();
                                        event.stopPropagation();
                                        location.href = "/artist/${artist.id}";
                                    }}
                                >
                                    {`${artist.name}${
                                        index < album.artists.length - 1
                                            ? ","
                                            : ""
                                    }`}
                                </label>
                            ))}{" "}
                        </label>
                    </Link>
                ))}
            </div>
        </section>
    );
}

function SongsSection({ spotifySongs }: { spotifySongs: RockItSong[] }) {
    const lang = useLanguage();
    if (!lang) return false;

    return (
        <section className="py-2 text-white md:py-6 md:pl-12">
            <h2 className="px-5 text-left text-2xl font-bold md:px-0 md:text-3xl">
                {lang.songs}
            </h2>
            <div className="relative flex items-center gap-4 overflow-x-auto px-8 py-4 md:pr-14 md:pl-4">
                {spotifySongs?.map((song) => (
                    <Link
                        href={`/song/${song.publicId}`}
                        className="w-36 flex-none transition md:w-48 md:hover:scale-105"
                        key={"song" + song.publicId}
                    >
                        <Image
                            width={
                                getBestImage(song.album.externalImages)
                                    ?.width ?? 350
                            }
                            height={
                                getBestImage(song.album.externalImages)
                                    ?.height ?? 350
                            }
                            className="aspect-square w-full rounded-lg object-cover"
                            src={
                                getBestImage(song.album.externalImages)?.url ||
                                "/song-placeholder.png"
                            }
                            alt="Song Cover"
                        />
                        <label className="mt-2 block truncate text-center font-semibold">
                            {song.name}
                        </label>
                        <label className="block truncate text-center text-sm text-gray-400">
                            {song.artists.map((artist, index) => (
                                <label
                                    key={song.publicId + artist.publicId}
                                    className="md:hover:underline"
                                    onClick={(event) => {
                                        event.preventDefault();
                                        event.stopPropagation();
                                        location.href = "/artist/${artist.id}";
                                    }}
                                >
                                    {`${artist.name}${
                                        index < song.artists.length - 1
                                            ? ","
                                            : ""
                                    }`}
                                </label>
                            ))}{" "}
                        </label>
                    </Link>
                ))}
            </div>
        </section>
    );
}

function Results() {
    const $searchResults = useStore(rockitIt.searchManager.searchResultsAtom);
    const $searching = useStore(rockitIt.searchManager.searchingAtom);
    const $searchQuery = useStore(rockitIt.searchManager.searchQueryAtom);
    const lang = useLanguage();

    if (!lang) return false;

    if (!$searchResults?.spotifyResults && !$searching && $searchQuery) {
        return (
            <label className="mx-10 block text-center text-sm font-bold text-wrap text-red-500">
                It seems to be an error searching your music
            </label>
        );
    }

    if ($searching) {
    }

    if (!$searchQuery) {
        return (
            <section className="flex flex-col items-center justify-center px-7 py-36 text-center text-white md:pl-12">
                <h2 className="text-2xl font-bold md:text-3xl">
                    {lang.search_empty1}
                </h2>
                <p className="mt-10 text-lg md:mt-2 md:text-xl">
                    {lang.search_empty2}
                </p>
                <Image
                    width={144}
                    height={144}
                    className="mt-10 w-36"
                    src="/logo-banner.png"
                    alt="Rockit Logo"
                />
            </section>
        );
    }

    if ($searchResults?.spotifyResults) {
        return (
            <div className="overflow-y-auto pt-0 md:pt-24">
                <SongsSection
                    spotifySongs={$searchResults.spotifyResults.songs}
                />
                <AlbumsSection
                    spotifyAlbums={$searchResults.spotifyResults.albums}
                />
            </div>
        );
    }

    return;
}

export default function Search() {
    const lang = useLanguage();

    if (typeof window !== "undefined" && !window.navigator.onLine) {
        return <div>You are offline</div>;
    }

    if (!lang) return false;

    return (
        <>
            <section className="mt-20 block h-28 px-5 md:hidden">
                <SearchBar />
            </section>
            <Results />
        </>
    );
}
