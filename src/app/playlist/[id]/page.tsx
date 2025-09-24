import Image from "@/components/Image";
import PlaylistHeader from "@/components/Playlist/PlaylistHeader";
import PlaylistSongsView from "@/components/Playlist/PlaylistSongsView";
import { getSession } from "@/lib/utils/auth/getSession";
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
import { getStats } from "@/lib/utils/stats";
import { SpotifyPlaylistImage } from "@/types/spotify";
import { NextResponse } from "next/server";
import { getLang } from "@/lib/utils/getLang";
import { notFound } from "next/navigation";
import { reduce } from "@/lib/utils/arrayTools";

interface Playlist {
    name: string;
    songs: PlaylistDBSong[];
    image: string;
    images: SpotifyPlaylistImage[] | undefined;
    owner: string;
}

async function getPlaylist(id: string) {
    const session = await getSession();
    const lang = await getLang(session?.user?.lang || "en");

    let playlist: Playlist | undefined;

    if (id == "liked") {
        const userDB = parseUser(
            db
                .prepare("SELECT likedSongs FROM user WHERE id = ?")
                .get(session?.user.id) as RawUserDB
        ) as UserDB<"likedSongs">;

        playlist = {
            name: lang?.liked_songs ?? "Liked Songs",
            songs: userDB.likedSongs,
            image: "",
            images: [{ url: "/song-placeholder.png", height: 1, width: 1 }],
            owner: "Rock It!",
        };
    } else if (id == "most-listened") {
        if (!session?.user.id) {
            notFound();
        }

        const { stats } = await getStats(session.user.id);
        const songs = reduce(
            stats.songs.toSorted((a, b) => b.timesPlayed - a.timesPlayed),
            (item) => item.id
        ).slice(0, 50);

        playlist = {
            name: lang?.most_listened ?? "Most listened",
            songs: songs,
            image: "",
            images: [{ url: "/song-placeholder.png", height: 1, width: 1 }],
            owner: "Rock It!",
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

        if (!session?.user.id) notFound();

        const { stats } = await getStats(session.user.id, start, end);
        // let songs: SongForStats[] = [];

        const monthKeys = [
            "january",
            "february",
            "march",
            "april",
            "may",
            "june",
            "july",
            "august",
            "september",
            "october",
            "november",
            "december",
        ];

        const now = new Date();
        const prevMonthIndex = now.getMonth() - 1 < 0 ? 11 : now.getMonth() - 1;
        const prevMonthKey = monthKeys[prevMonthIndex];
        const localizedMonth =
            lang[prevMonthKey as keyof typeof lang] || prevMonthKey;

        const songs = reduce(
            stats.songs.toSorted((a, b) => b.timesPlayed - a.timesPlayed),
            (item) => item.id
        ).slice(0, 50);

        const lastMonthNamDate = new Date();
        lastMonthNamDate.setMonth(lastMonthNamDate.getMonth() - 1);

        const lastMonthNameIndex = new Intl.DateTimeFormat("en", {
            month: "long",
        })
            .format(lastMonthNamDate)
            .toLowerCase();

        playlist = {
            name: `${localizedMonth} Recap`,
            songs: songs,
            image: "",
            images: [
                {
                    url: `/recap-covers/${lastMonthNameIndex}.png`,
                    height: 1,
                    width: 1,
                },
            ],
            owner: "Rock It!",
        };
    } else if (id == "recent-mix") {
        if (!session?.user.id) notFound();

        const { stats } = await getStats(
            session.user.id,
            new Date().getTime() - 10 * 24 * 60 * 60 * 1000
        );
        const songs = reduce(
            stats.songs.toSorted((a, b) => b.timesPlayed - a.timesPlayed),
            (item) => item.id
        ).slice(0, 50);

        playlist = {
            name: lang?.recent_mix ?? "Recent Mix",
            songs: songs,
            image: "",
            images: [{ url: "/song-placeholder.png", height: 1, width: 1 }],
            owner: "Rock It!",
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
    const { id } = await params;
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

    let inDatabase: boolean = true;

    if (!playlist) {
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
                const songDb = db
                    .prepare(
                        "SELECT name, albumId, duration, artists, path, albumName, image, images FROM song WHERE id = ?"
                    )
                    .get(song.id) as RawSongDB;

                if (!songDb) {
                    console.warn(
                        "TODO should make a request to backend and get it from database. Song",
                        song.id,
                        "not found"
                    );
                    return undefined;
                }

                if (!songDb.path) {
                    inDatabase = false;
                }

                return {
                    added_at: song.added_at,
                    id: song.id,
                    ...(parseSong(songDb) as SongDB<
                        | "name"
                        | "albumId"
                        | "duration"
                        | "artists"
                        | "path"
                        | "albumName"
                        | "image"
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
                showSkeleton={false}
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
