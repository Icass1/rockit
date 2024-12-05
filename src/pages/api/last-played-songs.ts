import { db, parseSong, type RawSongDB, type SongDB } from "@/lib/db";
import { PlayedSongs } from "@/lib/stats";
import type { APIContext } from "astro";
import { readFile } from "fs/promises";

export async function GET(context: APIContext): Promise<Response> {
    if (!context.locals.user) {
        return new Response("Unauthenticated", { status: 401 });
    }

    // **************************
    // Replace with SELECT lastPlayedSong FROM user WHERE id = ?     context.locals.user.id
    const fileBuffer = await readFile("lastPlayedSongs.json", "utf-8");
    const lastPlayedSongs: {
        [key: string]: number[];
    } = JSON.parse(fileBuffer);
    // **************************

    let songs: SongDB<
        "artists" | "id" | "name" | "duration" | "albumId" | "albumName"
    >[] = [];

    Array(Math.round(Object.keys(lastPlayedSongs).length / 900) + 1)
        .fill(0)
        .map((_, index) => {
            const query =
                "SELECT id,artists,duration,name,albumId,albumName FROM song WHERE id = " +
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
                    >
            );
            songs = [...songs, ...tempSongs];
        });

    return new Response(
        JSON.stringify(
            PlayedSongs(
                lastPlayedSongs,
                songs,
                new Date("2024-10-01T00:00:00").getTime(),
                new Date("2024-11-01T00:00:00").getTime()
            )
        ),
        {
            headers: {
                "Content-Type": "application/json",
            },
        }
    );
}
