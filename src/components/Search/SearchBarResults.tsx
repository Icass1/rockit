import { useStore } from "@nanostores/react";
import { searchQuery, searchResults } from "@/stores/searchResults";

import { DownloadCloud } from "lucide-react";
import {
    useEffect,
    useState,
    type MouseEvent,
    type ReactNode,
    type RefObject,
} from "react";
import stringSimilarity from "@/lib/stringSimilarity";
import Image from "next/image";

function Result({
    image,
    name,
    artistsOrOwner,
    inDatabase,
    url,
}: {
    image: string;
    name: string;
    artistsOrOwner: string;
    inDatabase: boolean;
    url: string;
}) {
    const handleClick = (
        event: MouseEvent<HTMLDivElement, globalThis.MouseEvent>
    ) => {
        event.stopPropagation();
        event.preventDefault();
    };
    return (
        <a
            className={
                "flex flex-row h-full rounded overflow-hidden gap-x-2 bg-zinc-700 md:hover:bg-zinc-500/60 transition-colors cursor-pointer items-center " +
                (artistsOrOwner == "" ? " rounded-l-[70px] rounded-r-lg " : " ")
            }
            href={url
                .replace("https://open.spotify.com", "")
                .replace("track", "song")}
        >
            <Image
                alt={name}
                className={
                    "aspect-square w-auto h-full object-cover object-center " +
                    (artistsOrOwner == "" ? " rounded-full " : " ")
                }
                src={image}
            />
            <div className="flex flex-col text-white min-w-0 max-w-full w-full">
                <label className="text-base font-semibold truncate">
                    {name}
                </label>
                <label className="text-sm truncate">{artistsOrOwner}</label>
            </div>
            {!inDatabase && (
                <div
                    className="w-6 h-6 mr-2 text-blue-400 md:hover:scale-105 transition-transform"
                    onClick={handleClick}
                >
                    <DownloadCloud />
                </div>
            )}
        </a>
    );
}

function ResultsWrapper({ children }: { children: ReactNode[] }) {
    return (
        <div className="grid xl:grid-cols-2 lg:grid-cols-1 md:grid-cols-1 gap-2 mb-2 h-fit">
            {children}
        </div>
    );
}

export default function RenderSearchBarResults({
    divRef,
    open,
}: {
    divRef: RefObject<HTMLDivElement | null>;
    open: boolean;
}) {
    const $searchResults = useStore(searchResults);
    const [bestResult, setBestResult] = useState<
        | {
              name: string;
              artistsOrOwner: string;
              url: string;
              image: string;
              inDatabase: boolean;
              type: string;
          }
        | undefined
    >();
    const $searchQuery = useStore(searchQuery);

    useEffect(() => {
        let highestSimilarity = 0;
        let bestResult = undefined;
        const searchQuery = $searchQuery;

        if ($searchResults.albums != "error")
            $searchResults.albums?.map((album) => {
                const similarity = stringSimilarity(album.name, searchQuery);
                if (similarity > highestSimilarity) {
                    highestSimilarity = similarity;
                    bestResult = {
                        name: album.name,
                        artistsOrOwner: album.artists
                            .map((artist) => artist.name)
                            .join(","),
                        url: album.external_urls.spotify,
                        image: album.images[0]?.url,
                        inDatabase: album.inDatabase,
                        type: "album",
                    };
                }
            });
        if ($searchResults.playlists != "error")
            $searchResults.playlists?.map((playlist) => {
                const similarity = stringSimilarity(playlist.name, searchQuery);
                if (similarity > highestSimilarity) {
                    highestSimilarity = similarity;
                    bestResult = {
                        name: playlist.name,
                        artistsOrOwner: playlist.owner.display_name,
                        url: playlist.external_urls.spotify,
                        image: playlist.images[0]?.url,
                        inDatabase: playlist.inDatabase,
                        type: "playlist",
                    };
                }
            });
        if ($searchResults.songs != "error")
            $searchResults.songs?.map((song) => {
                const similarity = stringSimilarity(song.name, searchQuery);
                if (similarity > highestSimilarity) {
                    highestSimilarity = similarity;
                    bestResult = {
                        name: song.name,
                        artistsOrOwner: song.album.artists
                            .map((artist) => artist.name)
                            .join(","),
                        url: song.external_urls.spotify,
                        image: song.album.images[0]?.url,
                        inDatabase: song.inDatabase,
                        type: "song",
                    };
                }
            });
        if ($searchResults.artists != "error")
            $searchResults.artists?.map((artist) => {
                const similarity = stringSimilarity(artist.name, searchQuery);
                if (similarity > highestSimilarity) {
                    highestSimilarity = similarity;
                    bestResult = {
                        name: artist.name,
                        artistsOrOwner: "",
                        url: artist.external_urls.spotify,
                        image: artist.images[0]?.url,
                        inDatabase: true,
                        type: "artist",
                    };
                }
            });

        setBestResult(bestResult);
    }, [$searchResults, $searchQuery]);

    return (
        <div ref={divRef}>
            {open ? (
                <div className="h-fit px-4 w-3/4 max-w-[600px] bg-neutral-800 absolute shadow-lg left-1/2 -translate-x-1/2 top-1/2 rounded-b-3xl flex flex-col pt-7 pb-2  gap-2 z-50">
                    {bestResult && (
                        <>
                            <label className="font-bold text-xl text-white ">
                                Best result {bestResult.type}
                            </label>
                            <div className="h-32">
                                <Result
                                    name={bestResult.name}
                                    artistsOrOwner={bestResult.artistsOrOwner}
                                    inDatabase={bestResult.inDatabase}
                                    image={bestResult.image}
                                    url={bestResult?.url}
                                />
                            </div>
                        </>
                    )}
                    {$searchResults.songs &&
                        $searchResults.songs != "error" && (
                            <>
                                <label className="font-bold text-xl text-white ">
                                    Songs
                                </label>
                                <ResultsWrapper>
                                    {$searchResults.songs
                                        .slice(0, 2)
                                        .map((song, index) => (
                                            <div className="h-12" key={index}>
                                                <Result
                                                    key={"song" + index}
                                                    name={song.name}
                                                    artistsOrOwner={
                                                        song.artists &&
                                                        song.artists
                                                            .map(
                                                                (artist) =>
                                                                    artist.name
                                                            )
                                                            .join(", ")
                                                    }
                                                    inDatabase={song.inDatabase}
                                                    image={
                                                        song.album.images[0]
                                                            ?.url
                                                    }
                                                    url={
                                                        song.external_urls
                                                            .spotify
                                                    }
                                                />
                                            </div>
                                        ))}
                                </ResultsWrapper>
                            </>
                        )}
                    {$searchResults.albums &&
                        $searchResults.albums != "error" && (
                            <>
                                <label className="font-bold text-xl text-white ">
                                    Albums
                                </label>
                                <ResultsWrapper>
                                    {$searchResults.albums
                                        .slice(0, 2)
                                        .map((album, index) => (
                                            <div className="h-12" key={index}>
                                                <Result
                                                    key={"album" + index}
                                                    name={album.name}
                                                    artistsOrOwner={
                                                        album.artists &&
                                                        album.artists
                                                            .map(
                                                                (artist) =>
                                                                    artist.name
                                                            )
                                                            .join(", ")
                                                    }
                                                    inDatabase={
                                                        album.inDatabase
                                                    }
                                                    image={album.images[0]?.url}
                                                    url={
                                                        album.external_urls
                                                            .spotify
                                                    }
                                                />
                                            </div>
                                        ))}
                                </ResultsWrapper>
                            </>
                        )}
                    {$searchResults.playlists &&
                        $searchResults.playlists != "error" && (
                            <>
                                <label className="font-bold text-xl text-white ">
                                    Playlists
                                </label>
                                <ResultsWrapper>
                                    {$searchResults.playlists
                                        .slice(0, 2)
                                        .map((playlist, index) => (
                                            <div className="h-12" key={index}>
                                                <Result
                                                    key={"playlist" + index}
                                                    name={playlist.name}
                                                    artistsOrOwner={
                                                        playlist.owner
                                                            .display_name
                                                    }
                                                    inDatabase={
                                                        playlist.inDatabase
                                                    }
                                                    image={
                                                        playlist.images[0]?.url
                                                    }
                                                    url={
                                                        playlist.external_urls
                                                            .spotify
                                                    }
                                                />
                                            </div>
                                        ))}
                                </ResultsWrapper>
                            </>
                        )}
                    {$searchResults.artists &&
                        $searchResults.artists != "error" && (
                            <>
                                <label className="font-bold text-xl text-white ">
                                    Artists
                                </label>
                                <ResultsWrapper>
                                    {$searchResults.artists
                                        .slice(0, 2)
                                        .map((artist, index) => (
                                            <div className="h-12" key={index}>
                                                <Result
                                                    key={"playlist" + index}
                                                    name={artist.name}
                                                    artistsOrOwner=""
                                                    inDatabase={true}
                                                    image={
                                                        artist.images[0]?.url
                                                    }
                                                    url={
                                                        artist.external_urls
                                                            .spotify
                                                    }
                                                />
                                            </div>
                                        ))}
                                </ResultsWrapper>
                            </>
                        )}
                </div>
            ) : (
                <></>
            )}
        </div>
    );
}
