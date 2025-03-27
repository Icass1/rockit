import { db } from "@/lib/db/db";
import { type SongDB } from "@/lib/db/song";
import type { APIContext } from "astro";

export async function GET(context: APIContext): Promise<Response> {
    const id = context.params.id as string;

    let song;
    try {
        song = (await db
            .prepare(
                `SELECT ${
                    context.url.searchParams.get("q") || "*"
                } FROM song WHERE id = ?`
            )
            .get(id)) as SongDB;
    } catch (err) {
        return new Response(err?.toString(), { status: 404 });
    }

    if (!song) {
        return new Response("Song not found", { status: 404 });
    }

    return new Response(JSON.stringify({ ...song, inDatabase: true }), {
        headers: {
            "Content-Type": "application/json",
        },
    });
}
