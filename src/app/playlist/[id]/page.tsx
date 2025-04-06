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
import { getStats, SongForStats } from "@/lib/stats";
import { SpotifyPlaylistImage } from "@/types/spotify";

interface Playlist {
    name: string;
    songs: PlaylistDBSong[];
    image: string;
    images: SpotifyPlaylistImage[] | undefined;
    owner: string;
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params; // No need for await here

    const song = {
        title: `title ${id}`,
        artist: "artist",
        image_url: "https://reactnative.dev/img/homepage/devices-dark.png",
        id: "id_test",
    };

    return {
        title: song.title,
        description: `Escucha ${song.title} de ${song.artist}`,
        openGraph: {
            title: song.title,
            description: `Escucha ${song.title} de ${song.artist}`,
            type: "music.song",
            url: `https://tuweb.com/song/${song.id}`,
            images: [
                {
                    url:
                        song.image_url || "https://tuweb.com/default-image.jpg",
                    width: 1200,
                    height: 630,
                    alt: song.title,
                },
            ],
        },
        twitter: {
            card: "summary_large_image",
            title: song.title,
            description: `Escucha ${song.title} de ${song.artist}`,
            images: [song.image_url || "https://tuweb.com/default-image.jpg"],
        },
    };
}

export default async function PlaylistPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params; // No need for await here

    const session = await getSession();

    let playlist: Playlist | undefined;
    let inDatabase;

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

    if (playlist) {
        inDatabase = true;
    } else {
        return new Response(
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

    console.log(id);

    return (
        <div className="px-3 md:px-2 flex flex-col md:flex-row gap-2 w-full h-full relative">
            <PlaylistHeader
                id={id}
                playlist={playlist}
                songs={songs}
                inDatabase={inDatabase}
                className="hidden md:flex w-full"
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
