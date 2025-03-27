import { db } from "@/lib/db/db";
import { type PlaylistDB } from "@/lib/db/playlist";
import type { APIContext } from "astro";

export async function GET(context: APIContext): Promise<Response> {
    const id = context.params.id as string;

    const playlist = (await db
        .prepare("SELECT * FROM playlist WHERE id = ?")
        .get(id)) as PlaylistDB;

    if (!playlist) {
        return new Response("Playlist not found", { status: 404 });
    }

    return new Response(JSON.stringify(playlist), {
        headers: {
            "Content-Type": "application/json",
        },
    });
}
