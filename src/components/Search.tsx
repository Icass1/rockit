import { searchResults } from "@/stores/searchResults";
import { useStore } from "@nanostores/react";

export default function Search() {
    const $searchResults = useStore(searchResults);

    return (
        <>
            <section className="md:px-12 px-3 py-12 text-white">
                <h2 className="text-3xl font-bold text-left">Songs</h2>
                <div className="relative flex items-center gap-4 overflow-x-auto py-4 px-2">
                    {/* Aquí creamos las canciones */}
                    {$searchResults.songs?.map((song) => (
                        <a
                            href={`/song/${song.id}`}
                            className="flex-none w-48 md:hover:scale-105 transition"
                            key={"song" + song.id}
                        >
                            <img
                                className="rounded-lg w-full aspect-square object-cover"
                                src={
                                    song.album.images[0].url ||
                                    "/song-placeholder.png"
                                }
                                alt="Song Cover"
                            />
                            <label className="truncate font-semibold text-center block mt-2">
                                {song.name}
                            </label>
                            <label className="truncate text-sm text-center text-gray-400 block">
                                {song.artists.map((artist, index) => (
                                    <label
                                        key={song.id + artist.id}
                                        className="md:hover:underline"
                                        onClick={(event) => {
                                            event.preventDefault();
                                            event.stopPropagation();
                                            location.href =
                                                "/artist/${artist.id}";
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
                        </a>
                    ))}
                </div>
            </section>

            <section className="md:px-12 px-3 py-12 text-white">
                <h2 className="text-3xl font-bold text-left">Albums</h2>
                <div className="relative flex items-center gap-4 overflow-x-auto py-4 px-2">
                    {/* Aquí creamos las canciones */}
                    {$searchResults.albums?.map((album) => (
                        <a
                            href={`/album/${album.id}`}
                            className="flex-none w-48 md:hover:scale-105 transition"
                            key={"album" + album.id}
                        >
                            <img
                                className="rounded-lg w-full aspect-square object-cover"
                                src={
                                    album.images[0].url ||
                                    "/song-placeholder.png"
                                }
                                alt="Song Cover"
                            />
                            <label className="truncate font-semibold text-center block mt-2">
                                {album.name}
                            </label>
                            <label className="truncate text-sm text-center text-gray-400 block">
                                {album.artists.map((artist, index) => (
                                    <label
                                        key={album.id + artist.id}
                                        className="md:hover:underline"
                                        onClick={(event) => {
                                            event.preventDefault();
                                            event.stopPropagation();
                                            location.href =
                                                "/artist/${artist.id}";
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
                        </a>
                    ))}
                </div>
            </section>

            <section className="md:px-12 px-3 py-12 text-white">
                <h2 className="text-3xl font-bold text-left">Artists</h2>
                <div className="relative flex items-center gap-4 overflow-x-auto py-4 px-2">
                    {/* Aquí creamos las canciones */}
                    {$searchResults.artists?.map((artist) => (
                        <a
                            href={`/artist/${artist.id}`}
                            className="flex-none w-48 md:hover:scale-105 transition"
                            key={"artist" + artist.id}
                        >
                            <img
                                className="rounded-full w-full aspect-square object-cover"
                                src={
                                    (artist.images[0] &&
                                        artist.images[0].url) ||
                                    "/user-placeholder.png"
                                }
                                alt="Song Cover"
                            />
                            <label className="truncate font-semibold text-center block mt-2">
                                {artist.name}
                            </label>
                        </a>
                    ))}
                </div>
            </section>

            <section className="md:px-12 px-3 py-12 text-white">
                <h2 className="text-3xl font-bold text-left">Playlists</h2>
                <div className="relative flex items-center gap-4 overflow-x-auto py-4 px-2">
                    {/* Aquí creamos las canciones  */}
                    {$searchResults.playlists?.map((playlist) => (
                        <a
                            href={`/playlist/${playlist.id}`}
                            className="flex-none w-48 md:hover:scale-105 transition"
                            key={"playlist" + playlist.id}
                        >
                            <img
                                className="rounded-lg w-full aspect-square object-cover"
                                src={
                                    (playlist.images[0] &&
                                        playlist.images[0].url) ||
                                    "/song-placeholder.png"
                                }
                                alt="Song Cover"
                            />
                            <label className="truncate font-semibold text-center block mt-2">
                                {playlist.name}
                            </label>
                            <label className="truncate text-sm text-center text-gray-400 block">
                                {playlist.owner.display_name}
                            </label>
                        </a>
                    ))}
                </div>
            </section>
        </>
    );
}
