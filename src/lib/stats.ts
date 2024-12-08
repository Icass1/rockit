import {
    type RawSongDB,
    type AlbumDB,
    type ArtistDB,
    type SongDB,
    db,
    parseSong,
} from "./db";
import { readFile } from "fs/promises";

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
    start?: number | undefined,
    end?: number | undefined
) {
    // **************************
    // Replace with SELECT lastPlayedSong FROM user WHERE id = ?     context.locals.user.id
    const fileBuffer = await readFile("lastPlayedSongs.json", "utf-8");
    const lastPlayedSongs: {
        [key: string]: number[];
    } = JSON.parse(fileBuffer);
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

    Array(Math.round(Object.keys(lastPlayedSongs).length / 900) + 1)
        .fill(0)
        .map((_, index) => {
            const query =
                "SELECT id,artists,duration,name,albumId,albumName,image,images FROM song WHERE id = " +
                Object.keys(lastPlayedSongs)
                    .splice(index * 900, (index + 1) * 900)
                    .map((key) => `'${key}'`)
                    .join(" OR id = ");

            const tempSongs = (db.prepare(query).all() as RawSongDB[]).map(
                (song) =>
                    parseSong(song) as SongDB<
                        | "artists"
                        | "id"
                        | "name"
                        | "duration"
                        | "albumId"
                        | "albumName"
                        | "image"
                        | "images"
                    >
            );
            songs = [...songs, ...tempSongs];
        });

    let out: Stats = { songs: [], artists: [], albums: [] };

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
                            image: song.image,
                            index: 1,
                            name: song.albumName,
                            id: song.albumId,
                            timesPlayed: 1,
                        });
                    }
                } else {
                    // console.log("Song not in database", `https://open.spotify.com/track/${entry[0]}`)
                }
            }
        });
    });

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
