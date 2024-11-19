import type { APIContext } from "astro";

import { db, parsePlaylist, type RawPlaylistDB } from "@/lib/db";

export async function GET(context: APIContext): Promise<Response> {

    const id = context.params.id as string

    const playlist = parsePlaylist(
        db.prepare("SELECT * FROM playlist WHERE id = ?").get(id) as RawPlaylistDB,
    );

    if (!playlist) {
        return new Response("Playlist not found", { status: 404 })
    }

    return new Response(JSON.stringify(playlist), {
        headers: {
            'Content-Type': 'application/json'
        }
    })
}