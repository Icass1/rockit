import { useStore } from "@nanostores/react";

import { Dispatch, useState, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { rockIt } from "@/lib/rockit/rockIt";
import { getBestImage } from "@/lib/utils/getBestImage";

function Result({
    image,
    name,
    artistsOrOwner,
    url,
    setOpen,
}: {
    image: string;
    name: string;
    artistsOrOwner: string;
    url: string;
    setOpen: Dispatch<React.SetStateAction<boolean>>;
}) {
    return (
        <Link
            onClick={() => setOpen(false)}
            className={
                "flex h-full cursor-pointer flex-row items-center gap-x-2 overflow-hidden rounded bg-zinc-700 transition-colors md:hover:bg-zinc-500/60 " +
                (artistsOrOwner == "" ? " rounded-l-[70px] rounded-r-lg" : " ")
            }
            href={url
                .replace("https://open.spotify.com", "")
                .replace("track", "song")}
        >
            <div className="aspect-square h-full w-auto">
                <Image
                    width={100}
                    height={100}
                    alt={name}
                    className={
                        "h-full w-full " +
                        (artistsOrOwner == "" ? " rounded-full" : " ")
                    }
                    src={image}
                />
            </div>
            <div className="flex w-full max-w-full min-w-0 flex-col text-white">
                <label className="truncate text-base font-semibold">
                    {name}
                </label>
                <label className="truncate text-sm">{artistsOrOwner}</label>
            </div>
        </Link>
    );
}

function ResultsWrapper({ children }: { children: ReactNode[] }) {
    return (
        <div className="mb-2 grid h-fit gap-2 md:grid-cols-1 lg:grid-cols-1 xl:grid-cols-2">
            {children}
        </div>
    );
}

export default function RenderSearchBarResults({
    open,
    setOpen,
}: {
    open: boolean;
    setOpen: Dispatch<React.SetStateAction<boolean>>;
}) {
    const $searchResults = useStore(rockIt.searchManager.searchResultsAtom);
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
    const $searchQuery = useStore(rockIt.searchManager.searchQueryAtom);

    console.log("RenderSearchBarResults", setBestResult, $searchQuery);

    // useEffect(() => {
    //     if (!$searchResults) return;

    //     let highestSimilarity = 0;
    //     let bestResult = undefined;
    //     const searchQuery = $searchQuery;

    //     if ($searchResults.spotifyResults.albums)
    //         $searchResults.spotifyResults.albums?.map((album) => {
    //             const similarity = stringSimilarity(album.name, searchQuery);
    //             if (similarity > highestSimilarity) {
    //                 highestSimilarity = similarity;
    //                 bestResult = {
    //                     name: album.name,
    //                     artistsOrOwner: album.artists
    //                         .map((artist) => artist.name)
    //                         .join(","),
    //                     url: album.external_urls.spotify,
    //                     image: album.images[0]?.url,
    //                     inDatabase: album.inDatabase,
    //                     type: "album",
    //                 };
    //             }
    //         });
    //     if ($searchResults.spotifyResults)
    //         $searchResults.spotifyResults.playlists?.map((playlist) => {
    //             const similarity = stringSimilarity(playlist.name, searchQuery);
    //             if (similarity > highestSimilarity) {
    //                 highestSimilarity = similarity;
    //                 bestResult = {
    //                     name: playlist.name,
    //                     artistsOrOwner: playlist.owner.display_name,
    //                     url: playlist.external_urls.spotify,
    //                     image: playlist.images[0]?.url,
    //                     inDatabase: playlist.inDatabase,
    //                     type: "playlist",
    //                 };
    //             }
    //         });
    //     if ($searchResults.spotifyResults.songs)
    //         $searchResults.spotifyResults.songs?.map((song) => {
    //             const similarity = stringSimilarity(song.name, searchQuery);
    //             if (similarity > highestSimilarity) {
    //                 highestSimilarity = similarity;
    //                 bestResult = {
    //                     name: song.name,
    //                     artistsOrOwner: song.album.artists
    //                         .map((artist) => artist.name)
    //                         .join(","),
    //                     url: song.external_urls.spotify,
    //                     image: song.album.images[0]?.url,
    //                     inDatabase: song.inDatabase,
    //                     type: "song",
    //                 };
    //             }
    //         });
    //     if ($searchResults.artists != "error")
    //         $searchResults.artists?.map((artist) => {
    //             const similarity = stringSimilarity(artist.name, searchQuery);
    //             if (similarity > highestSimilarity) {
    //                 highestSimilarity = similarity;
    //                 bestResult = {
    //                     name: artist.name,
    //                     artistsOrOwner: "",
    //                     url: artist.external_urls.spotify,
    //                     image: artist.images[0]?.url,
    //                     inDatabase: true,
    //                     type: "artist",
    //                 };
    //             }
    //         });

    //     setBestResult(bestResult);
    // }, [$searchResults, $searchQuery]);

    if (!$searchResults) return <div>Loading...</div>;

    return (
        <div id="search-bar-results">
            {open ? (
                <div className="absolute top-1/2 left-1/2 z-50 flex h-fit w-full -translate-x-1/2 -translate-y-2 flex-col gap-2 rounded-b-3xl bg-neutral-800 px-4 pt-7 shadow-lg">
                    {bestResult && (
                        <>
                            <label className="mt-3 text-xl font-bold text-white">
                                Best result {bestResult.type}
                            </label>
                            <div className="h-32">
                                <Result
                                    name={bestResult.name}
                                    artistsOrOwner={bestResult.artistsOrOwner}
                                    image={bestResult.image}
                                    url={bestResult?.url}
                                    setOpen={setOpen}
                                />
                            </div>
                        </>
                    )}
                    {$searchResults.spotifyResults.songs && (
                        <>
                            <label className="text-xl font-bold text-white">
                                Songs
                            </label>
                            <ResultsWrapper>
                                {$searchResults.spotifyResults.songs
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
                                                image={
                                                    getBestImage(
                                                        song.album
                                                            .externalImages
                                                    )?.url ??
                                                    rockIt.SONG_PLACEHOLDER_IMAGE_URL
                                                }
                                                url={"to do"}
                                                setOpen={setOpen}
                                            />
                                        </div>
                                    ))}
                            </ResultsWrapper>
                        </>
                    )}
                    {$searchResults.spotifyResults.albums && (
                        <>
                            <label className="text-xl font-bold text-white">
                                Albums
                            </label>
                            <ResultsWrapper>
                                {$searchResults.spotifyResults.albums
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
                                                image={
                                                    getBestImage(
                                                        album.externalImages
                                                    )?.url ??
                                                    rockIt.ALBUM_PLACEHOLDER_IMAGE_URL
                                                }
                                                url={"to do"}
                                                setOpen={setOpen}
                                            />
                                        </div>
                                    ))}
                            </ResultsWrapper>
                        </>
                    )}
                    {$searchResults.spotifyResults.playlists && (
                        <>
                            <label className="text-xl font-bold text-white">
                                Playlists
                            </label>
                            <ResultsWrapper>
                                {$searchResults.spotifyResults.playlists
                                    .slice(0, 2)
                                    .map((playlist, index) => (
                                        <div className="h-12" key={index}>
                                            <Result
                                                key={"playlist" + index}
                                                name={playlist.name}
                                                artistsOrOwner={playlist.owner}
                                                image={
                                                    getBestImage(
                                                        playlist.externalImages
                                                    )?.url ??
                                                    rockIt.PLAYLIST_PLACEHOLDER_IMAGE_URL
                                                }
                                                url={"to do"}
                                                setOpen={setOpen}
                                            />
                                        </div>
                                    ))}
                            </ResultsWrapper>
                        </>
                    )}
                    {$searchResults.spotifyResults.artists && (
                        <>
                            <label className="text-xl font-bold text-white">
                                Artists
                            </label>
                            <ResultsWrapper>
                                {$searchResults.spotifyResults.artists
                                    .slice(0, 2)
                                    .map((artist, index) => (
                                        <div className="h-12" key={index}>
                                            <Result
                                                key={"playlist" + index}
                                                name={artist.name}
                                                artistsOrOwner=""
                                                image={
                                                    getBestImage(
                                                        artist.externalImages
                                                    )?.url ??
                                                    rockIt.ALBUM_PLACEHOLDER_IMAGE_URL
                                                }
                                                url={"to do"}
                                                setOpen={setOpen}
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
