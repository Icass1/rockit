import type { APIContext } from "astro";

import { db } from "@/lib/db";

export async function POST(context: APIContext): Promise<Response> {
    const data = await context.request.json();

    let name = data.name;
    let id = data.id;
    let images = JSON.stringify(data.images);
    let description = data.description;
    let followers = data.followers;
    let owner = data.owner;
    let songs = JSON.stringify(data.songs);

    const playlist = db.prepare("SELECT * FROM playlist WHERE id = ?").get(id);
    if (playlist) {
        return new Response("OK");
    }

    try {
        db.prepare(
            "INSERT INTO playlist (id, images, name, description, owner, followers, songs) VALUES(?, ?, ?, ?, ?, ?, ?)"
        ).run(id, images, name, description, owner, followers, songs);
    } catch (err) {
        console.warn("Error in new-playlist", err?.toString());
        console.log(data);
    }

    return new Response("OK");
}
