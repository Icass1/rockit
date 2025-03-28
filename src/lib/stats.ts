import type { AlbumDB, ArtistDB } from "@/db/album";
import { type SongDB } from "@/db/song";
import { type UserDB } from "@/db/user";
import { db } from "./db/db";

interface AlbumForStats extends AlbumDB<"name" | "id" | "artists" | "image"> {
    timesPlayed: number;
    index: number;
}

interface ArtistForStats extends ArtistDB {
    timesPlayed: number;
    index: number;
}
interface SongWithTimePlayed
    extends SongDB<
        | "artists"
        | "id"
        | "duration"
        | "name"
        | "image"
        | "images"
        | "albumId"
        | "albumName"
    > {
    timePlayed: number;
}

export interface SongForStats
    extends SongDB<
        | "id"
        | "name"
        | "image"
        | "artists"
        | "albumId"
        | "albumName"
        | "images"
        | "duration"
    > {
    timesPlayed: number;
    index: number;
}

export interface Stats {
    songs: SongWithTimePlayed[];
    artists: ArtistForStats[];
    albums: AlbumForStats[];
}

export async function getStats(
    userId: string,
    start?: number | undefined,
    end?: number | undefined
) {
    // **************************
    // Replace with SELECT lastPlayedSong FROM user WHERE id = ?     context.locals.user.id
    // const fileBuffer = await readFile("lastPlayedSongs.json", "utf-8");
    // const lastPlayedSongs: {
    //     [key: string]: number[];
    // } = JSON.parse(fileBuffer);

    const lastPlayedSongs = (
        (await db
            .prepare("SELECT lastPlayedSong FROM user WHERE id = ?")
            .get(userId)) as UserDB
    )?.lastPlayedSong as {
        [key: string]: number[];
    };

    // **************************

    let songs: SongDB<
        | "artists"
        | "id"
        | "name"
        | "duration"
        | "albumId"
        | "albumName"
        | "image"
        | "images"
    >[] = [];

    if (!lastPlayedSongs) {
        return { songs: [], artists: [], albums: [] };
    }

    await Promise.all(
        Array(Math.floor(Object.keys(lastPlayedSongs).length / 900) + 1)
            .fill(0)
            .map(async (_, index) => {
                const query =
                    "SELECT id,artists,duration,name,albumId,albumName,image,images FROM song WHERE id = " +
                    Object.keys(lastPlayedSongs)
                        .splice(index * 900, (index + 1) * 900)
                        .map((key) => `'${key}'`)
                        .join(" OR id = ");

                const tempSongs = (await db.prepare(query).all()) as SongDB<
                    | "artists"
                    | "id"
                    | "name"
                    | "duration"
                    | "albumId"
                    | "albumName"
                    | "image"
                    | "images"
                >[];
                songs = [...songs, ...tempSongs];
            })
    );

    let out: Stats = { songs: [], artists: [], albums: [] };

    // let notInDatabase = [];

    Object.entries(lastPlayedSongs).map((entry) => {
        entry[1].map((time) => {
            if ((start ? start < time : true) && (end ? time < end : true)) {
                let song = songs.find((song) => song.id == entry[0]);
                if (song) {
                    out.songs.push({
                        artists: song.artists,
                        id: song.id,
                        timePlayed: time,
                        duration: song.duration,
                        name: song.name,
                        image: song.image,
                        images: song.images,
                        albumId: song.albumId,
                        albumName: song.albumName,
                    });
                    song.artists.map((artist) => {
                        let artistOut = out.artists.find(
                            (tempArtist) => tempArtist.id == artist.id
                        );
                        if (artistOut) {
                            artistOut.timesPlayed += 1;
                        } else {
                            out.artists.push({
                                index: 1,
                                name: artist.name,
                                id: artist.id,
                                timesPlayed: 1,
                            });
                        }
                    });

                    let album = out.albums.find(
                        (album) => album.id == song.albumId
                    );
                    if (album) {
                        album.timesPlayed += 1;
                    } else {
                        out.albums.push({
                            artists: song.artists,
                            image: song.image as string, // song.image should always exist
                            index: 1,
                            name: song.albumName,
                            id: song.albumId,
                            timesPlayed: 1,
                        });
                    }
                } else {
                    // if (
                    //     !notInDatabase.includes(
                    //         `https://open.spotify.com/track/${entry[0]}`
                    //     )
                    // ) {
                    //     notInDatabase.push(
                    //         `https://open.spotify.com/track/${entry[0]}`
                    //     );
                    // }
                    // console.log("Song not in database", `https://open.spotify.com/track/${entry[0]}`)
                }
            }
        });
    });
    // console.log(notInDatabase);

    // // Write to the file
    // await writeFile("out.json", JSON.stringify(notInDatabase), (err) => {
    //     if (err) {
    //         console.error("Error writing to file:", err);
    //     } else {
    //         console.log("File successfully written to out.json");
    //     }
    // });

    const sortedAlbums = [...out.albums];
    sortedAlbums.sort((a, b) => b.timesPlayed - a.timesPlayed);
    out.albums.map((album) => {
        album.index = sortedAlbums.indexOf(album);
    });

    const sortedArtists = [...out.artists];
    sortedArtists.sort((a, b) => b.timesPlayed - a.timesPlayed);
    out.artists.map((artist) => {
        artist.index = sortedArtists.indexOf(artist);
    });

    // out.artists.sort((a, b) => b.timesPlayed - a.timesPlayed);
    out.songs.sort((a, b) => a.timePlayed - b.timePlayed);

    return out;
}
