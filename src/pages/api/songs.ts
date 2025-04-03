import { db } from "@/lib/db/db";
import { parseSong, type RawSongDB } from "@/lib/db/song";
import type { APIContext } from "astro";

export async function GET(context: APIContext): Promise<Response> {
    let songs;
    try {
        songs = context.url.searchParams
            .get("songs")
            ?.split(",")
            .map((songID) =>
                parseSong(
                    db
                        .prepare(
                            `SELECT ${
                                context.url.searchParams.get("q") || "*"
                            } FROM song WHERE id = ?`
                        )
                        .get(songID) as RawSongDB
                )
            );
    } catch (err) {
        return new Response(err?.toString(), { status: 404 });
    }

    if (!songs) {
        return new Response("Song not found", { status: 404 });
    }

    return new Response(JSON.stringify(songs), {
        headers: {
            "Content-Type": "application/json",
        },
    });
}
