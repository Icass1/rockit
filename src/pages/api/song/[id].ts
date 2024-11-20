import type { APIContext } from "astro";

import { db, parseSong, type RawSongDB } from "@/lib/db";

export async function GET(context: APIContext): Promise<Response> {
    const id = context.params.id as string;

    let song;
    try {
        song = parseSong(
            db
                .prepare(
                    `SELECT ${
                        context.url.searchParams.get("q") || "*"
                    } FROM song WHERE id = ?`
                )
                .get(id) as RawSongDB
        );
    } catch (err) {
        return new Response(err?.toString(), { status: 404 });
    }

    if (!song) {
        return new Response("Song not found", { status: 404 });
    }

    return new Response(JSON.stringify(song), {
        headers: {
            "Content-Type": "application/json",
        },
    });
}
