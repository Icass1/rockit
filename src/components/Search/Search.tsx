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
            <section className="block md:hidden mt-20 h-12">
                <SearchBar />
            </section>
            {$searchQuery ? (
                <>
                    {$searchResults.albums == "error" ||
                    $searchResults.songs == "error" ||
                    $searchResults.artists == "error" ||
                    $searchResults.playlists == "error" ? (
                        <label className="text-center text-red-500 block text-sm font-bold mx-10 text-wrap">
                            It seems to be an error searching your music
                        </label>
                    ) : (
                        <>
                            <section className="md:px-12 md:py-6 py-2 text-white">
                                <h2 className="text-2xl md:text-3xl font-bold text-left px-5 md:px-0">
                                    {$lang.songs}
                                </h2>
                                <div className="relative flex items-center gap-4 overflow-x-auto py-4 md:px-2 px-8">
                                    {/* Aquí creamos las canciones */}
                                    {$searchResults.songs?.map((song) => (
                                        <Link
                                            href={`/song/${song.id}`}
                                            className="flex-none w-36 md:w-48 md:hover:scale-105 transition"
                                            key={"song" + song.id}
                                        >
                                            <Image
                                                width={60}
                                                height={60}
                                                className="rounded-lg w-full aspect-square object-cover"
                                                src={
                                                    song.album.images[0]?.url ||
                                                    "/song-placeholder.png"
                                                }
                                                alt="Song Cover"
                                            />
                                            <label className="truncate font-semibold text-center block mt-2">
                                                {song.name}
                                            </label>
                                            <label className="truncate text-sm text-center text-gray-400 block">
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

                            <section className="md:px-12 md:py-6 py-2 text-white">
                                <h2 className="text-2xl md:text-3xl font-bold text-left px-5 md:px-0">
                                    {$lang.albums}
                                </h2>
                                <div className="relative flex items-center gap-4 overflow-x-auto py-4 px-8 md:px-2">
                                    {/* Aquí creamos las canciones */}
                                    {$searchResults.albums?.map((album) => (
                                        <Link
                                            href={`/album/${album.id}`}
                                            className="flex-none w-36 md:w-48 md:hover:scale-105 transition"
                                            key={"album" + album.id}
                                        >
                                            <Image
                                                width={60}
                                                height={60}
                                                className="rounded-lg w-full aspect-square object-cover"
                                                src={
                                                    album.images[0]?.url ||
                                                    "/song-placeholder.png"
                                                }
                                                alt="Song Cover"
                                            />
                                            <label className="truncate font-semibold text-center block mt-2">
                                                {album.name}
                                            </label>
                                            <label className="truncate text-sm text-center text-gray-400 block">
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

                            <section className="md:px-12 md:py-6 py-2 text-white">
                                <h2 className="text-2xl md:text-3xl font-bold text-left px-5 md:px-0">
                                    {$lang.artists}
                                </h2>
                                <div className="relative flex items-center gap-4 overflow-x-auto py-4 px-8 md:px-2">
                                    {/* Aquí creamos las canciones */}
                                    {$searchResults.artists?.map((artist) => (
                                        <Link
                                            href={`/artist/${artist.id}`}
                                            className="flex-none w-36 md:w-48 md:hover:scale-105 transition"
                                            key={"artist" + artist.id}
                                        >
                                            <Image
                                                width={60}
                                                height={60}
                                                className="rounded-full w-full aspect-square object-cover"
                                                src={
                                                    (artist.images[0] &&
                                                        artist.images[0]
                                                            ?.url) ||
                                                    "/user-placeholder.png"
                                                }
                                                alt="Song Cover"
                                            />
                                            <label className="truncate font-semibold text-center block mt-2">
                                                {artist.name}
                                            </label>
                                        </Link>
                                    ))}
                                </div>
                            </section>

                            <section className="md:px-12 md:py-6 py-2 text-white">
                                <h2 className="text-2xl md:text-3xl font-bold text-left px-5 md:px-0">
                                    {$lang.playlists}
                                </h2>
                                <div className="relative flex items-center gap-4 overflow-x-auto py-4 px-8 md:px-2">
                                    {/* Aquí creamos las canciones  */}
                                    {$searchResults.playlists?.map(
                                        (playlist) => (
                                            <Link
                                                href={`/playlist/${playlist.id}`}
                                                className="flex-none w-36 md:w-48 md:hover:scale-105 transition"
                                                key={"playlist" + playlist.id}
                                            >
                                                <Image
                                                    width={60}
                                                    height={60}
                                                    className="rounded-lg w-full aspect-square object-cover"
                                                    src={
                                                        (playlist.images[0] &&
                                                            playlist.images[0]
                                                                ?.url) ||
                                                        "/song-placeholder.png"
                                                    }
                                                    alt="Song Cover"
                                                />
                                                <label className="truncate font-semibold text-center block mt-2">
                                                    {playlist.name}
                                                </label>
                                                <label className="truncate text-sm text-center text-gray-400 block">
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
                    <section className="md:px-12 md:py-6 py-2 text-white">
                        <h2 className="text-2xl md:text-3xl font-bold text-left px-5 md:px-0">
                            {$lang.radio_stations}
                        </h2>
                        <div className="relative flex items-center gap-4 overflow-x-auto py-4 px-8 md:px-2">
                            {$filteredStations.map((station) => (
                                <div
                                    className="flex-none w-36 md:w-48 md:hover:scale-105 transition"
                                    key={station.stationuuid}
                                    onClick={() => handleClick(station)}
                                >
                                    <Image
                                        width={60}
                                        height={60}
                                        className="rounded-lg w-full aspect-square object-cover"
                                        src={
                                            station.favicon ||
                                            "/logos/logo-sq-2.png"
                                        }
                                        alt="Song Cover"
                                    />
                                    <label className="truncate font-semibold text-center block mt-2">
                                        {station.name}
                                    </label>
                                    <label className="truncate text-sm text-center text-gray-400 block">
                                        {station.country}
                                    </label>
                                </div>
                            ))}
                        </div>
                    </section>
                    <section className="md:px-12 md:py-6 py-2 text-white">
                        <h2 className="text-2xl md:text-3xl font-bold text-left px-5 md:px-0">
                            Youtube Videos
                        </h2>
                        <div className="relative flex items-center gap-4 overflow-x-auto py-4 px-8 md:px-2">
                            {/* Mockup de videos */}
                            {Array.from({ length: 10 }).map((_, index) => (
                                <div
                                    className="flex-none w-64 md:w-80 md:hover:scale-105 transition"
                                    key={"video" + index}
                                >
                                    <Image
                                        width={60}
                                        height={60}
                                        className="rounded-lg w-full aspect-video object-cover"
                                        src="/video-placeholder.png"
                                        alt="Video Thumbnail"
                                    />
                                    <label className="truncate font-semibold text-left block mt-2">
                                        Video title mockup {index + 1}
                                    </label>
                                    <label className="truncate text-sm text-left text-gray-400 block">
                                        Author mockup {index + 1}
                                    </label>
                                </div>
                            ))}
                        </div>
                    </section>
                    <div className="min-h-14"></div>
                </>
            ) : (
                <section className="flex flex-col items-center justify-center md:px-12 px-7 py-36 text-white text-center">
                    <h2 className="text-2xl md:text-3xl font-bold">
                        {$lang.search_empty1}
                    </h2>
                    <p className="text-lg md:text-xl md:mt-2 mt-10">
                        {$lang.search_empty2}
                    </p>
                    <Image
                        width={144}
                        height={144}
                        className="w-36 mt-10"
                        src="/logo-banner.png"
                        alt="Rockit Logo"
                    />
                </section>
            )}
        </>
    );
}
