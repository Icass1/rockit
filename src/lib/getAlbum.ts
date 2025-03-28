import {
    isSpotifyError,
    type SpotifyAlbum,
    type SpotifyError,
    type SpotifyTrack,
} from "@/types/spotify";

import { type AlbumDB, type ArtistDB } from "@/db/album";
import { db } from "@/db/db";
import { type SongDB } from "@/db/song";
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

    album = (await db
        .prepare("SELECT * FROM album WHERE id = ?")
        .get(id)) as AlbumDB;

    if (album) {
        inDatabase = true;

        songs = (
            await Promise.all(
                album.songs.map(
                    async (
                        songID: string
                    ): Promise<
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
                        | undefined
                    > => {
                        const song = (await db
                            .prepare(
                                "SELECT image, images, id, name, artists, albumId, albumName, path, duration, discNumber, trackNumber FROM song WHERE id = ?"
                            )
                            .get(songID)) as SongDB | undefined;

                        if (song) return song;
                        inDatabase = false;

                        const response = await fetch(
                            `${BACKEND_URL}/song/${songID}`,
                            {
                                signal: AbortSignal.timeout(2000),
                            }
                        );

                        const responseJson =
                            (await response.json()) as SpotifyTrack;

                        return {
                            image: undefined,
                            images: responseJson.album.images,
                            id: songID,
                            name: responseJson.name,
                            artists: responseJson.artists,
                            albumId: responseJson.album.id,
                            albumName: responseJson.album.name,
                            path: undefined,
                            duration: responseJson.duration_ms / 1000,
                            discNumber: responseJson.disc_number,
                            trackNumber: responseJson.track_number,
                        };
                    }
                )
            )
        ).filter((a) => typeof a !== "undefined");

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

        songs = await Promise.all(
            data.tracks.items.map(async (item) => {
                const songDB = (await db
                    .prepare(
                        "SELECT image, id, name, artists, albumId, albumName, path, duration, discNumber, trackNumber FROM song WHERE id = ?"
                    )
                    .get(item.id)) as SongDB;

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
            })
        );

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
