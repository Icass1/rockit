import type { APIContext } from "astro";
import { readFile } from "fs/promises";
import { getStats } from "@/lib/stats";

import { db, parseSong, type RawSongDB, type SongDB } from "@/lib/db";

export async function GET(context: APIContext): Promise<Response> {
    if (!context.locals.user) {
        return new Response("Unauthenticated", { status: 401 });
    }

    const start = context.url.searchParams.get("start");
    const end = context.url.searchParams.get("end");

    if (!start || !end) {
        return new Response("Must pass start and end as search params", {
            status: 404,
        });
    }

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
    >[] = [];

    Array(Math.round(Object.keys(lastPlayedSongs).length / 900) + 1)
        .fill(0)
        .map((_, index) => {
            const query =
                "SELECT id,artists,duration,name,albumId,albumName,image FROM song WHERE id = " +
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
                    >
            );
            songs = [...songs, ...tempSongs];
        });

    const data = getStats(lastPlayedSongs, songs, Number(start), Number(end));

    return new Response(JSON.stringify(data), {
        headers: {
            "Content-Type": "application/json",
        },
    });
}
