import {
    searchResults,
    searchQuery,
    filteredStations,
} from "@/stores/searchResults";
import SearchBar from "@/components/Search/SearchBar";
import { useStore } from "@nanostores/react";
import { langData } from "@/stores/lang";
import { currentStation, play, type Station } from "@/stores/audio";
import Image from "@/components/Image";
import Link from "next/link";

export default function Search() {
    const $searchResults = useStore(searchResults);
    const $searchQuery = useStore(searchQuery);
    const $filteredStations = useStore(filteredStations);

    const $lang = useStore(langData);

    if (!window.navigator.onLine) {
        return <div>You are offline</div>;
    }

    function handleClick(station: Station) {
        currentStation.set(station);
        play();
    }

    if (!$lang) return;

    return (
        <>
            <section className="mt-20 block h-28 px-5 md:hidden">
                <SearchBar />
            </section>
            {$searchQuery ? (
                <div className="overflow-y-auto pt-0 md:pt-24">
                    {$searchResults.albums == "error" ||
                    $searchResults.songs == "error" ||
                    $searchResults.artists == "error" ||
                    $searchResults.playlists == "error" ? (
                        <label className="mx-10 block text-center text-sm font-bold text-wrap text-red-500">
                            It seems to be an error searching your music
                        </label>
                    ) : (
                        <>
                            <section className="py-2 text-white md:py-6 md:pl-12">
                                <h2 className="px-5 text-left text-2xl font-bold md:px-0 md:text-3xl">
                                    {$lang.songs}
                                </h2>
                                <div className="relative flex items-center gap-4 overflow-x-auto px-8 py-4 md:pr-14 md:pl-4">
                                    {/* Aquí creamos las canciones */}
                                    {$searchResults.songs?.map((song) => (
                                        <Link
                                            href={`/song/${song.id}`}
                                            className="w-36 flex-none transition md:w-48 md:hover:scale-105"
                                            key={"song" + song.id}
                                        >
                                            <Image
                                                width={60}
                                                height={60}
                                                className="aspect-square w-full rounded-lg object-cover"
                                                src={
                                                    song.album.images[0]?.url ||
                                                    "/song-placeholder.png"
                                                }
                                                alt="Song Cover"
                                            />
                                            <label className="mt-2 block truncate text-center font-semibold">
                                                {song.name}
                                            </label>
                                            <label className="block truncate text-center text-sm text-gray-400">
                                                {song.artists.map(
                                                    (artist, index) => (
                                                        <label
                                                            key={
                                                                song.id +
                                                                artist.id
                                                            }
                                                            className="md:hover:underline"
                                                            onClick={(
                                                                event
                                                            ) => {
                                                                event.preventDefault();
                                                                event.stopPropagation();
                                                                location.href =
                                                                    "/artist/${artist.id}";
                                                            }}
                                                        >
                                                            {`${artist.name}${
                                                                index <
                                                                song.artists
                                                                    .length -
                                                                    1
                                                                    ? ","
                                                                    : ""
                                                            }`}
                                                        </label>
                                                    )
                                                )}{" "}
                                            </label>
                                        </Link>
                                    ))}
                                </div>
                            </section>

                            <section className="py-2 text-white md:py-6 md:pl-12">
                                <h2 className="px-5 text-left text-2xl font-bold md:px-0 md:text-3xl">
                                    {$lang.albums}
                                </h2>
                                <div className="relative flex items-center gap-4 overflow-x-auto px-8 py-4 md:pr-14 md:pl-4">
                                    {/* Aquí creamos las canciones */}
                                    {$searchResults.albums?.map((album) => (
                                        <Link
                                            href={`/album/${album.id}`}
                                            className="w-36 flex-none transition md:w-48 md:hover:scale-105"
                                            key={"album" + album.id}
                                        >
                                            <Image
                                                width={60}
                                                height={60}
                                                className="aspect-square w-full rounded-lg object-cover"
                                                src={
                                                    album.images[0]?.url ||
                                                    "/song-placeholder.png"
                                                }
                                                alt="Song Cover"
                                            />
                                            <label className="mt-2 block truncate text-center font-semibold">
                                                {album.name}
                                            </label>
                                            <label className="block truncate text-center text-sm text-gray-400">
                                                {album.artists.map(
                                                    (artist, index) => (
                                                        <label
                                                            key={
                                                                album.id +
                                                                artist.id
                                                            }
                                                            className="md:hover:underline"
                                                            onClick={(
                                                                event
                                                            ) => {
                                                                event.preventDefault();
                                                                event.stopPropagation();
                                                                location.href =
                                                                    "/artist/${artist.id}";
                                                            }}
                                                        >
                                                            {`${artist.name}${
                                                                index <
                                                                album.artists
                                                                    .length -
                                                                    1
                                                                    ? ","
                                                                    : ""
                                                            }`}
                                                        </label>
                                                    )
                                                )}{" "}
                                            </label>
                                        </Link>
                                    ))}
                                </div>
                            </section>

                            <section className="py-2 text-white md:py-6 md:pl-12">
                                <h2 className="px-5 text-left text-2xl font-bold md:px-0 md:text-3xl">
                                    {$lang.artists}
                                </h2>
                                <div className="relative flex items-center gap-4 overflow-x-auto px-8 py-4 md:pr-14 md:pl-4">
                                    {/* Aquí creamos las canciones */}
                                    {$searchResults.artists?.map((artist) => (
                                        <Link
                                            href={`/artist/${artist.id}`}
                                            className="w-36 flex-none transition md:w-48 md:hover:scale-105"
                                            key={"artist" + artist.id}
                                        >
                                            <Image
                                                width={60}
                                                height={60}
                                                className="aspect-square w-full rounded-full object-cover"
                                                src={
                                                    (artist.images[0] &&
                                                        artist.images[0]
                                                            ?.url) ||
                                                    "/user-placeholder.png"
                                                }
                                                alt="Song Cover"
                                            />
                                            <label className="mt-2 block truncate text-center font-semibold">
                                                {artist.name}
                                            </label>
                                        </Link>
                                    ))}
                                </div>
                            </section>

                            <section className="py-2 text-white md:py-6 md:pl-12">
                                <h2 className="px-5 text-left text-2xl font-bold md:px-0 md:text-3xl">
                                    {$lang.playlists}
                                </h2>
                                <div className="relative flex items-center gap-4 overflow-x-auto px-8 py-4 md:pr-14 md:pl-4">
                                    {/* Aquí creamos las canciones  */}
                                    {$searchResults.playlists?.map(
                                        (playlist) => (
                                            <Link
                                                href={`/playlist/${playlist.id}`}
                                                className="w-36 flex-none transition md:w-48 md:hover:scale-105"
                                                key={"playlist" + playlist.id}
                                            >
                                                <Image
                                                    width={60}
                                                    height={60}
                                                    className="aspect-square w-full rounded-lg object-cover"
                                                    src={
                                                        (playlist.images[0] &&
                                                            playlist.images[0]
                                                                ?.url) ||
                                                        "/song-placeholder.png"
                                                    }
                                                    alt="Song Cover"
                                                />
                                                <label className="mt-2 block truncate text-center font-semibold">
                                                    {playlist.name}
                                                </label>
                                                <label className="block truncate text-center text-sm text-gray-400">
                                                    {
                                                        playlist.owner
                                                            .display_name
                                                    }
                                                </label>
                                            </Link>
                                        )
                                    )}
                                </div>
                            </section>
                        </>
                    )}
                    <section className="py-2 text-white md:py-6 md:pl-12">
                        <h2 className="px-5 text-left text-2xl font-bold md:px-0 md:text-3xl">
                            {$lang.radio_stations}
                        </h2>
                        <div className="relative flex items-center gap-4 overflow-x-auto px-8 py-4 md:pr-14 md:pl-4">
                            {$filteredStations.map((station) => (
                                <div
                                    className="w-36 flex-none transition md:w-48 md:hover:scale-105"
                                    key={station.stationuuid}
                                    onClick={() => handleClick(station)}
                                >
                                    <Image
                                        width={60}
                                        height={60}
                                        className="aspect-square w-full rounded-lg object-cover"
                                        src={
                                            station.favicon ||
                                            "/logos/logo-sq-2.png"
                                        }
                                        alt="Song Cover"
                                    />
                                    <label className="mt-2 block truncate text-center font-semibold">
                                        {station.name}
                                    </label>
                                    <label className="block truncate text-center text-sm text-gray-400">
                                        {station.country}
                                    </label>
                                </div>
                            ))}
                        </div>
                    </section>
                    <section className="py-2 text-white md:py-6 md:pl-12">
                        <h2 className="px-5 text-left text-2xl font-bold md:px-0 md:text-3xl">
                            Youtube Videos
                        </h2>
                        <div className="relative flex items-center gap-4 overflow-x-auto px-8 py-4 md:pr-14 md:pl-4">
                            {/* Mockup de videos */}
                            {Array.from({ length: 10 }).map((_, index) => (
                                <div
                                    className="w-64 flex-none transition md:w-80 md:hover:scale-105"
                                    key={"video" + index}
                                >
                                    <Image
                                        width={60}
                                        height={60}
                                        className="aspect-video w-full rounded-lg object-cover"
                                        src="/video-placeholder.png"
                                        alt="Video Thumbnail"
                                    />
                                    <label className="mt-2 block truncate text-left font-semibold">
                                        Video title mockup {index + 1}
                                    </label>
                                    <label className="block truncate text-left text-sm text-gray-400">
                                        Author mockup {index + 1}
                                    </label>
                                </div>
                            ))}
                        </div>
                    </section>
                    <div className="min-h-24 md:min-h-0"></div>
                </div>
            ) : (
                <section className="flex flex-col items-center justify-center px-7 py-36 text-center text-white md:pl-12">
                    <h2 className="text-2xl font-bold md:text-3xl">
                        {$lang.search_empty1}
                    </h2>
                    <p className="mt-10 text-lg md:mt-2 md:text-xl">
                        {$lang.search_empty2}
                    </p>
                    <Image
                        width={144}
                        height={144}
                        className="mt-10 w-36"
                        src="/logo-banner.png"
                        alt="Rockit Logo"
                    />
                </section>
            )}
        </>
    );
}
