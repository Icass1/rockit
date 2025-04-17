import Image from "@/components/Image";
import PlaylistHeader from "@/components/Playlist/PlaylistHeader";
import PlaylistSongsView from "@/components/Playlist/PlaylistSongsView";
import { getSession } from "@/lib/auth/getSession";
import { db } from "@/lib/db/db";
import {
    parsePlaylist,
    PlaylistDBSong,
    PlaylistDBSongWithAddedAt,
    RawPlaylistDB,
} from "@/lib/db/playlist";
import { parseSong, RawSongDB, SongDB } from "@/lib/db/song";
import { parseUser, RawUserDB, UserDB } from "@/lib/db/user";
import { getImageUrl } from "@/lib/getImageUrl";
import { getStats, SongForStats } from "@/lib/stats";
import { SpotifyPlaylistImage } from "@/types/spotify";
import { NextResponse } from "next/server";

interface Playlist {
    name: string;
    songs: PlaylistDBSong[];
    image: string;
    images: SpotifyPlaylistImage[] | undefined;
    owner: string;
}

async function getPlaylist(id: string) {
    const session = await getSession();

    let playlist: Playlist | undefined;

    if (id == "liked") {
        const userDB = parseUser(
            db
                .prepare("SELECT likedSongs FROM user WHERE id = ?")
                .get(session.user.id) as RawUserDB
        ) as UserDB<"likedSongs">;

        playlist = {
            name: "Liked",
            songs: userDB.likedSongs,
            image: "",
            images: [{ url: "/song-placeholder.png", height: 1, width: 1 }],
            owner: "",
        };
    } else if (id == "most-listened") {
        const stats = await getStats(session.user.id);
        let songs: SongForStats[] = [];

        stats.songs.forEach((song) => {
            const result = songs.find((findSong) => findSong.id == song.id);
            if (result) {
                result.timesPlayed += 1;
            } else {
                songs.push({
                    index: 0,
                    name: song.name,
                    id: song.id,
                    timesPlayed: 1,
                    albumId: song.albumId,
                    albumName: song.albumName,
                    duration: song.duration,
                    images: song.images,
                    artists: song.artists,
                    image: song.image,
                });
            }
        });
        songs = songs
            .toSorted((a, b) => b.timesPlayed - a.timesPlayed)
            .slice(0, 50);

        playlist = {
            name: "Most listened",
            songs: songs,
            image: "",
            images: [{ url: "/song-placeholder.png", height: 1, width: 1 }],
            owner: "",
        };
    } else if (id == "last-month") {
        const date = new Date();
        const month = date.getMonth() - 1;
        const year = date.getFullYear();
        date.setMonth(month);
        date.setDate(1);
        date.setHours(0);
        date.setMinutes(0);
        date.setSeconds(0);
        date.setMilliseconds(0);

        const start = date.getTime();

        date.setDate(0);
        date.setMonth(month);
        date.setFullYear(year);
        date.setHours(23);
        date.setMinutes(59);
        date.setSeconds(59);
        date.setMilliseconds(0);
        const end = date.getTime();

        // console.log(start, end);

        const stats = await getStats(session.user.id, start, end);
        let songs: SongForStats[] = [];

        stats.songs.forEach((song) => {
            const result = songs.find((findSong) => findSong.id == song.id);
            if (result) {
                result.timesPlayed += 1;
            } else {
                songs.push({
                    index: 0,
                    name: song.name,
                    id: song.id,
                    timesPlayed: 1,
                    albumId: song.albumId,
                    albumName: song.albumName,
                    duration: song.duration,
                    images: song.images,
                    artists: song.artists,
                    image: song.image,
                });
            }
        });
        songs = songs
            .toSorted((a, b) => b.timesPlayed - a.timesPlayed)
            .slice(0, 50);

        playlist = {
            name: "Most listened",
            songs: songs,
            image: "",
            images: [{ url: "/song-placeholder.png", height: 1, width: 1 }],
            owner: "",
        };
    } else if (id == "recent-mix") {
        const stats = await getStats(
            session.user.id,
            new Date().getTime() - 10 * 24 * 60 * 60 * 1000
        );
        let songs: SongForStats[] = [];

        stats.songs.forEach((song) => {
            const result = songs.find((findSong) => findSong.id == song.id);
            if (result) {
                result.timesPlayed += 1;
            } else {
                songs.push({
                    index: 0,
                    name: song.name,
                    id: song.id,
                    timesPlayed: 1,
                    albumId: song.albumId,
                    albumName: song.albumName,
                    duration: song.duration,
                    images: song.images,
                    artists: song.artists,
                    image: song.image,
                });
            }
        });
        songs = songs
            .toSorted((a, b) => b.timesPlayed - a.timesPlayed)
            .slice(0, 50);

        playlist = {
            name: "Most listened",
            songs: songs,
            image: "",
            images: [{ url: "/song-placeholder.png", height: 1, width: 1 }],
            owner: "",
        };
    } else {
        playlist = parsePlaylist(
            db
                .prepare("SELECT * FROM playlist WHERE id = ?")
                .get(id) as RawPlaylistDB
        );
    }

    return playlist;
}
export async function generateMetadata({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params; // No need for await here
    const playlist = await getPlaylist(id);

    if (!playlist) {
        return {};
    }

    return {
        title: `${playlist.name} by ${playlist.owner}`,
        description: `Listen to ${playlist.name} by ${playlist.owner}`,
        openGraph: {
            title: `${playlist.name} by ${playlist.owner}`,
            description: `Listen to ${playlist.name} by ${playlist.owner}`,
            type: "music.playlist",
            url: `https://rockit.rockhosting.org/playlist/${id}`,
            images: [
                {
                    url:
                        "https://rockit.rockhosting.org" +
                        getImageUrl({ imageId: playlist.image }),
                    width: 600,
                    height: 600,
                    alt: playlist.name,
                },
            ],
        },
        twitter: {
            card: "",
            title: `${playlist.name} by ${playlist.owner}`,
            description: `Listen to ${playlist.name} by ${playlist.owner}`,
            images: [
                {
                    url:
                        "https://rockit.rockhosting.org" +
                        getImageUrl({ imageId: playlist.image }),
                    width: 600,
                    height: 600,
                    alt: playlist.name,
                },
            ],
        },
    };
}

export default async function PlaylistPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params; // No need for await here

    const playlist = await getPlaylist(id);

    let inDatabase: boolean;

    if (playlist) {
        inDatabase = true;
    } else {
        return new NextResponse(
            JSON.stringify({
                error: "",
            }),
            {
                status: 404,
            }
        );
    }

    const songs = playlist.songs
        .map(
            (
                song
            ):
                | PlaylistDBSongWithAddedAt<
                      | "name"
                      | "albumId"
                      | "duration"
                      | "artists"
                      | "path"
                      | "albumName"
                      | "image"
                      | "id"
                      | "images"
                  >
                | undefined => {
                return {
                    added_at: song.added_at,
                    ...(parseSong(
                        db
                            .prepare(
                                "SELECT name, albumId, duration, artists, path, albumName, image, images, id FROM song WHERE id = ?"
                            )
                            .get(song.id) as RawSongDB
                    ) as SongDB<
                        | "name"
                        | "albumId"
                        | "duration"
                        | "artists"
                        | "path"
                        | "albumName"
                        | "image"
                        | "id"
                        | "images"
                    >),
                };
            }
        )
        .filter(
            (
                song
            ): song is PlaylistDBSongWithAddedAt<
                | "id"
                | "images"
                | "image"
                | "name"
                | "albumId"
                | "duration"
                | "artists"
                | "path"
                | "albumName"
            > => song !== undefined
        );

    return (
        <div className="relative flex h-full w-full flex-col gap-2 px-3 md:flex-row md:px-2">
            <Image
                src={`/api/image/blur/${playlist.image}`}
                alt=""
                className="fixed top-0 left-0 h-full w-full object-cover opacity-35"
            />
            <PlaylistHeader
                id={id}
                playlist={playlist}
                songs={songs}
                inDatabase={inDatabase}
                className="hidden w-full md:flex"
            />

            <PlaylistSongsView
                id={id}
                songs={songs}
                inDatabase={inDatabase}
                playlist={playlist}
            />
        </div>
    );
}
