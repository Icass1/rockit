import {
    isSpotifyError,
    type SpotifyAlbum,
    type SpotifyError,
} from "@/types/spotify";
import {
    db,
    parseAlbum,
    parseSong,
    type AlbumDB,
    type ArtistDB,
    type RawAlbumDB,
    type RawSongDB,
    type SongDB,
} from "./db";
import { ENV } from "@/rockitEnv";

const BACKEND_URL = ENV.BACKEND_URL;

type Song = SongDB<
    | "image"
    | "images"
    | "id"
    | "name"
    | "artists"
    | "albumId"
    | "albumName"
    | "path"
    | "duration"
    | "discNumber"
    | "trackNumber"
>;

export type GetAlbum = {
    album: AlbumDB<
        "name" | "songs" | "artists" | "images" | "releaseDate" | "id" | "image"
    >;
    songs: Song[];
    discs: Song[][];
    inDatabase: boolean;
};

export default async function getAlbum(
    id: string
): Promise<GetAlbum | "error connecting to backend" | "not found"> {
    let album:
        | AlbumDB<
              | "name"
              | "songs"
              | "artists"
              | "images"
              | "releaseDate"
              | "id"
              | "image"
          >
        | undefined;
    let inDatabase: boolean;
    let songs: Song[];
    let discs: Song[][];

    album = parseAlbum(
        db.prepare("SELECT * FROM album WHERE id = ?").get(id) as RawAlbumDB
    );

    if (album) {
        inDatabase = true;

        songs = album.songs
            .map(
                (
                    songID: string
                ):
                    | SongDB<
                          | "image"
                          | "images"
                          | "id"
                          | "name"
                          | "artists"
                          | "albumId"
                          | "albumName"
                          | "path"
                          | "duration"
                          | "discNumber"
                          | "trackNumber"
                      >
                    | undefined => {
                    return parseSong(
                        db
                            .prepare(
                                "SELECT image, images, id, name, artists, albumId, albumName, path, duration, discNumber, trackNumber FROM song WHERE id = ?"
                            )
                            .get(songID) as RawSongDB
                    );
                }
            )
            .map((song) => {
                if (song == undefined) {
                    inDatabase = false;
                }
                return song;
            })
            .filter((a) => typeof a !== "undefined");

        songs.sort((a, b) => {
            if (
                typeof a?.trackNumber == "undefined" ||
                typeof b?.trackNumber == "undefined"
            ) {
                return 0;
            }
            return a.trackNumber - b.trackNumber;
        });

        discs = Array(Math.max(...songs.map((song) => song?.discNumber || 0)))
            .fill(1)
            .map((_) => []);

        songs.map((song) => {
            if (song?.discNumber) {
                discs[song?.discNumber - 1].push({ ...song });
            }
        });
    } else {
        inDatabase = false;
        let response;
        try {
            response = await fetch(`${BACKEND_URL}/album/${id}`, {
                signal: AbortSignal.timeout(2000),
            });
        } catch (error) {
            return "error connecting to backend";
        }
        if (!response.ok) {
            return "not found";
        }
        const data: SpotifyAlbum | SpotifyError = await response.json();

        if (isSpotifyError(data)) {
            return "not found";
        }

        album = {
            id: data.id,
            artists: data.artists as ArtistDB[],
            images: data.images,
            name: data.name,
            releaseDate: data.release_date,
            songs: data.tracks.items.map((item) => item.id),
            image: "",
        };

        songs = data.tracks.items.map((item) => {
            const songDB = parseSong(
                db
                    .prepare(
                        "SELECT image, id, name, artists, albumId, albumName, path, duration, discNumber, trackNumber FROM song WHERE id = ?"
                    )
                    .get(item.id) as RawSongDB
            );

            if (songDB) {
                return songDB;
            }

            return {
                id: item.id,
                images: data.images,
                name: item.name,
                image: "",
                artists: data.artists,
                albumId: data.id,
                albumName: data.name,
                path: "",
                duration: item.duration_ms / 1000,
                discNumber: item.disc_number,
                trackNumber: item.track_number,
            };
        });

        songs.sort((a, b) => {
            if (
                typeof a?.trackNumber == "undefined" ||
                typeof b?.trackNumber == "undefined"
            ) {
                return 0;
            }
            return a.trackNumber - b.trackNumber;
        });

        discs = Array(Math.max(...songs.map((song) => song?.discNumber || 0)))
            .fill(1)
            .map((_) => []);

        songs.map((song) => {
            if (song?.discNumber) {
                discs[song?.discNumber - 1].push({ ...song });
            }
        });
    }

    return { album, inDatabase, songs, discs };
}
