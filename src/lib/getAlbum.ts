import { type AlbumDB, parseAlbum, type RawAlbumDB } from "@/db/album";
import { db } from "@/db/db";
import { parseSong, type RawSongDB, type SongDB } from "@/db/song";
import { ENV } from "@/rockitEnv";
import { SpotifyTrack } from "@/types/spotify";

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
    let songs: Song[];
    let discs: Song[][];

    album = parseAlbum(
        db.prepare("SELECT * FROM album WHERE id = ?").get(id) as RawAlbumDB
    );

    if (!album) {
        const response = await fetch(`${BACKEND_URL}/album/${id}`, {
            signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) {
            return "error connecting to backend";
        }

        album = parseAlbum(
            db.prepare("SELECT * FROM album WHERE id = ?").get(id) as RawAlbumDB
        );
    }

    if (album) {
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
                        const rawSong = db
                            .prepare(
                                "SELECT image, images, id, name, artists, albumId, albumName, path, duration, discNumber, trackNumber FROM song WHERE id = ?"
                            )
                            .get(songID) as RawSongDB | undefined;

                        if (rawSong) return parseSong(rawSong);

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
                            images: responseJson.album?.images,
                            id: songID,
                            name: responseJson.name,
                            artists: responseJson.artists,
                            albumId: responseJson.album?.id,
                            albumName: responseJson.album?.name,
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
            .map(() => []);

        songs.map((song) => {
            if (song?.discNumber) {
                discs[song?.discNumber - 1].push({ ...song });
            }
        });
        return { album, songs, discs };
    }
    return "not found";
}
