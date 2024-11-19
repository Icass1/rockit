import type { APIContext } from "astro";

import { db, parseAlbum, type RawAlbumDB } from "@/lib/db";

export async function GET(context: APIContext): Promise<Response> {

    const id = context.params.id as string

    const album = parseAlbum(
        db.prepare("SELECT * FROM album WHERE id = ?").get(id) as RawAlbumDB,
    );

    if (!album) {
        return new Response("Album not found", { status: 404 })
    }

    return new Response(JSON.stringify(album), {
        headers: {
            'Content-Type': 'application/json'
        }
    })
}