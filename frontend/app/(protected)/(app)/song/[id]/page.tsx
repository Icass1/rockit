import Link from "next/link";
import LikeButton from "@/components/LikeButton";
import SongPopupMenu from "@/components/ListSongs/SongPopupMenu";
import { getTime } from "@/lib/getTime";
import { EllipsisVertical } from "lucide-react";
import SongPageCover from "@/components/SongPage/SongPageCover";
import LyricsSection from "@/components/SongPage/SongPageLyrics";
import { ENV } from "@/rockitEnv";
import { db } from "@/lib/db/db";
import {
    SpotifyArtist,
    SpotifyArtistTopTracks,
    SpotifyTrack,
} from "@/types/spotify";
import { parseSong, RawSongDB, SongDB } from "@/lib/db/song";
import getAlbum from "@/lib/getAlbum";
import Image from "@/components/Image";
import { getImageUrl } from "@/lib/getImageUrl";

export async function generateMetadata({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    const song = parseSong(
        db.prepare("SELECT * FROM song WHERE id = ?").get(id) as RawSongDB
    );

    if (!song) return;

    return {
        title: `${song.name} by ${song.artists[0].name}`,
        description: `Listen to ${song.name} by ${song.artists[0].name}`,
        openGraph: {
            title: `${song.name} by ${song.artists[0].name}`,
            description: `Listen to ${song.name} by ${song.artists[0].name}`,
            type: "music.song",
            url: `https://rockit.rockhosting.org/song/${id}`,
            images: [
                {
                    url:
                        "https://rockit.rockhosting.org" +
                        getImageUrl({ imageId: song.image }),
                    width: 600,
                    height: 600,
                    alt: song.name,
                },
            ],
        },
        twitter: {
            card: "",
            title: `${song.name} by ${song.artists[0].name}`,
            description: `Listen to ${song.name} by ${song.artists[0].name}`,
            images: [
                {
                    url:
                        "https://rockit.rockhosting.org" +
                        getImageUrl({ imageId: song.image }),
                    width: 600,
                    height: 600,
                    alt: song.name,
                },
            ],
        },
    };
}

export default async function SongPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    let inDatabase;
    let song:
        | SongDB<
              | "id"
              | "albumId"
              | "artists"
              | "name"
              | "lyrics"
              | "image"
              | "path"
              | "images"
              | "albumName"
              | "duration"
          >
        | undefined;
    let artistSongs;
    let album;
    let artist: SpotifyArtist | undefined;
    song = parseSong(
        db.prepare("SELECT * FROM song WHERE id = ?").get(id) as RawSongDB
    );

    const BACKEND_URL = ENV.BACKEND_URL;

    if (song) {
        inDatabase = true;

        const _album = await getAlbum(song?.albumId);
        if (_album == "error connecting to backend") {
        } else if (_album == "not found") {
        } else {
            album = _album;
        }
    } else {
        inDatabase = false;

        const response = await fetch(`${BACKEND_URL}/song/${id}`, {
            signal: AbortSignal.timeout(2000),
        });
        if (response.ok) {
            const spotifySong = (await response.json()) as SpotifyTrack;
            song = {
                id: spotifySong.id,
                image: "",
                albumId: spotifySong.album.id,
                artists: spotifySong.artists,
                name: spotifySong.name,
                lyrics: "",
                path: "",
                images: spotifySong.album?.images,
                albumName: spotifySong.album.name,
                duration: spotifySong.duration_ms / 1000,
            };
        } else {
            return new Response("Song not found", { status: 404 });
        }
        const _album = await getAlbum(song.albumId);
        if (_album == "error connecting to backend") {
        } else if (_album == "not found") {
        } else {
            album = _album;
        }
    }

    if (!album) {
        throw "Album not found";
    }

    let response;

    try {
        response = await fetch(
            `${BACKEND_URL}/artist-top-songs/${song.artists[0].id}`,
            {
                signal: AbortSignal.timeout(2000),
            }
        );
        if (response.ok) {
            artistSongs = (await response.json()) as SpotifyArtistTopTracks;
        }
    } catch {}

    try {
        response = await fetch(`${BACKEND_URL}/artist/${song.artists[0].id}`, {
            signal: AbortSignal.timeout(2000),
        });
        if (response.ok) {
            artist = await response.json();
        }
    } catch {}

    return (
        <div className="h-full w-full overflow-y-scroll p-2 pt-16 pb-16 md:mt-0 md:mb-0 md:pt-24 md:pb-24">
            {/* Header */}
            <div className="mx-auto grid w-full grid-cols-1 items-center gap-4 px-10 md:grid-cols-3 md:p-6">
                {/* Artista */}
                <div className="hidden flex-col items-center justify-center md:flex">
                    <div className="flex w-full max-w-sm items-center rounded-lg bg-neutral-200 p-4 shadow-md">
                        <div className="h-32 w-32 flex-shrink-0 overflow-hidden rounded-full bg-neutral-300">
                            <Image
                                src={
                                    artist?.images[0]?.url ||
                                    "/user-placeholder.png"
                                }
                                alt="Artista"
                                className="h-full w-full"
                                imageClassName="object-cover"
                            />
                        </div>
                        <div className="ml-4">
                            <Link
                                href={`/artist/${artist?.id}`}
                                className="text-2xl font-bold text-gray-800 hover:underline"
                            >
                                {artist?.name}
                            </Link>
                            {song.artists.length > 1 && (
                                <div className="text-md font-semibold text-gray-600">
                                    ft.{" "}
                                    {song.artists.slice(1).map((a, i) => (
                                        <span key={a.id}>
                                            <Link
                                                href={`/artist/${a.id}`}
                                                className="hover:underline"
                                            >
                                                {a.name}
                                            </Link>
                                            {i < song.artists.length - 2 &&
                                                ", "}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Canción */}
                <div className="flex flex-col items-center justify-center">
                    <SongPageCover
                        song={song}
                        album={album}
                        inDatabase={inDatabase}
                    />
                    <h1 className="mt-4 line-clamp-3 text-center text-3xl font-bold">
                        {song.name}
                    </h1>

                    <div className="flex flex-col items-center md:hidden">
                        <Link
                            href={`/album/${album.album.id}`}
                            className="py-2 text-center text-2xl font-semibold text-neutral-300 hover:underline"
                        >
                            {album.album.name}
                        </Link>
                        <p className="text-center text-lg font-semibold text-neutral-400">
                            {song.artists.map((a, i) => (
                                <span key={a.id}>
                                    <Link href={`/artist/${a.id}`}>
                                        {a.name}
                                    </Link>
                                    {i < song.artists.length - 1 && ", "}
                                </span>
                            ))}
                        </p>
                    </div>

                    <div className="mt-4 flex flex-row justify-center gap-4">
                        <div className="flex flex-row items-center gap-2 rounded bg-[#3030306f] p-2 select-none hover:bg-[#313131]">
                            <LikeButton song={song} />
                            <span>Like</span>
                        </div>
                        <SongPopupMenu song={song}>
                            <div className="flex cursor-pointer items-center rounded bg-[#3030306f] p-2 hover:bg-[#313131]">
                                <EllipsisVertical className="h-5 w-5" />
                                <span>More Options</span>
                            </div>
                        </SongPopupMenu>
                    </div>
                </div>

                {/* Álbum */}
                <div className="hidden flex-col items-center justify-center md:flex">
                    <div className="flex w-full max-w-sm items-center rounded-lg bg-neutral-200 p-4 shadow-md">
                        <div className="ml-4">
                            <Link
                                href={`/album/${album.album.id}`}
                                className="text-2xl font-bold text-gray-800 hover:underline"
                            >
                                {album.album.name}
                            </Link>
                            <p className="text-md font-semibold text-gray-600">
                                Album released on{" "}
                                {album.album.releaseDate
                                    .split("-")
                                    .reverse()
                                    .join("/")}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Letras y canciones del álbum */}
            <section className="my-5 flex flex-col justify-between gap-5 px-6 md:mx-16 md:flex-row md:px-0">
                <LyricsSection song={song} />

                <div className="mx-auto w-full rounded-lg bg-[#3030306f] px-4 py-8 md:max-w-[66%] md:px-8">
                    <h2 className="pb-4 text-center text-xl font-bold md:text-left">
                        Songs from{" "}
                        <Link
                            href={`/album/${album.album.id}`}
                            className="text-2xl hover:underline"
                        >
                            {album.album.name}
                        </Link>
                    </h2>
                    {album.songs.map((s, idx) => (
                        <Link
                            key={s.id}
                            href={`/song/${s.id}`}
                            className="group mt-2 flex justify-between"
                        >
                            <span className="font-semibold text-[#b2b2b2]">
                                {idx + 1}
                            </span>
                            <span className="flex-1 truncate font-semibold group-hover:underline">
                                {s.name}
                            </span>
                            <span className="text-[#b2b2b2]">
                                {getTime(s.duration)}
                            </span>
                        </Link>
                    ))}
                </div>
            </section>

            {/* Más canciones del artista */}
            <section className="text-white md:px-12 md:py-5">
                <h2 className="px-5 text-center text-2xl font-bold md:px-0 md:text-left md:text-3xl">
                    More songs from {song.artists[0].name}
                </h2>
                <div className="relative flex items-center gap-5 overflow-x-auto px-10 py-4 md:[scrollbar-gutter:stable]">
                    {artistSongs?.tracks
                        .filter((t) => t.id !== id)
                        .map((t) => (
                            <Link
                                key={t.id}
                                href={`/song/${t.id}`}
                                className="w-40 flex-none transition hover:scale-105 md:w-48"
                            >
                                <Image
                                    src={
                                        t.album?.images[0]?.url ||
                                        "/api/image/song-placeholder.png"
                                    }
                                    alt="Song Cover"
                                    className="aspect-square w-full rounded-lg object-cover"
                                />
                                <span className="mt-2 block truncate font-semibold">
                                    {t.name}
                                </span>
                                <span className="block truncate text-sm text-gray-400">
                                    {t.album.name}
                                </span>
                            </Link>
                        ))}
                </div>
            </section>
        </div>
    );
}
