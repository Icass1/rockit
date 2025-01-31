import type { APIContext } from "astro";

import { ENV } from "@/rockitEnv";
import type { SpotifyAlbum, SpotifyTrack } from "@/types/spotify";
import { type AlbumDB, parseAlbum, type RawAlbumDB } from "@/lib/db/album";
import { db } from "@/lib/db/db";
import { type SongDB, type RawSongDB, parseSong } from "@/lib/db/song";

const BACKEND_URL = ENV.BACKEND_URL;

export async function GET(context: APIContext): Promise<Response> {
    const id = context.params.id as string;

    let album: AlbumDB | undefined;
    album = parseAlbum(
        db.prepare("SELECT * FROM album WHERE id = ?").get(id) as RawAlbumDB
    );

    if (!album) {
        try {
            const response = await fetch(`${BACKEND_URL}/album/${id}`, {
                signal: AbortSignal.timeout(2000),
            });
            if (response.ok) {
                let responseAlbum = (await response.json()) as SpotifyAlbum;

                album = {
                    releaseDate: responseAlbum.release_date,
                    dateAdded: undefined,
                    artists: responseAlbum.artists,
                    type: responseAlbum.type,
                    discCount: responseAlbum.tracks.items.at(-1)
                        ?.disc_number as number, // items.at(-1) should always exist
                    genres: [],
                    popularity: responseAlbum.popularity,
                    id: responseAlbum.id,
                    image: "",
                    images: responseAlbum.images,
                    name: responseAlbum.name,
                    copyrights: responseAlbum.copyrights,
                    songs: responseAlbum.tracks.items.map((item) => item.id),
                };
            } else {
                console.error(
                    "Backend fetch failed:",
                    response.status,
                    response.statusText
                );
            }
        } catch (fetchError) {
            console.error("Fetch error:", fetchError);
        }
    }

    if (!album) {
        return new Response("Album not found", { status: 404 });
    }

    const songs = await Promise.all(
        album.songs.map(async (songId): Promise<SongDB | string> => {
            let song;
            try {
                const rawSong = db
                    .prepare("SELECT * FROM song WHERE id = ?")
                    .get(songId) as RawSongDB;
                if (rawSong) {
                    song = parseSong(rawSong);
                    if (song) {
                        return song;
                    }
                }
            } catch (dbError) {
                console.error("Database error:", dbError);
            }

            try {
                const response = await fetch(`${BACKEND_URL}/song/${songId}`, {
                    signal: AbortSignal.timeout(2000),
                });
                if (response.ok) {
                    song = (await response.json()) as SpotifyTrack;

                    return {
                        albumArtist: song.album.artists,
                        albumId: song.album.id,
                        albumName: song.album.name,
                        albumType: song.album.type,
                        name: song.name,
                        artists: song.artists,
                        dateAdded: undefined,
                        date: song.album.release_date,
                        discNumber: song.disc_number,
                        downloadUrl: undefined,
                        duration: song.duration_ms / 1000,
                        trackNumber: song.track_number,
                        id: song.id,
                        image: undefined,
                        images: song.album.images,
                        copyright: "",
                        genres: [],
                        lyrics: "",
                        path: "",
                        popularity: song.popularity,
                        publisher: "",
                    };
                } else {
                    console.error(
                        "Backend fetch failed:",
                        response.status,
                        response.statusText
                    );
                }
            } catch (fetchError) {
                console.error("Fetch error:", fetchError);
            }
            return songId;
        })
    );

    return new Response(JSON.stringify({ ...album, songs }), {
        headers: {
            "Content-Type": "application/json",
        },
    });
}
