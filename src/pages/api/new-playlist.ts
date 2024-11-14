import type { APIContext } from "astro";
import { db, Playlist, eq } from 'astro:db';


export async function POST(context: APIContext): Promise<Response> {

    const data = await context.request.json()

    let name = data.name
    let id = data.id
    let images = data.images
    let description = data.description
    let followers = data.followers
    let owner = data.owner
    let songs = data.songs


    const list = (await db.select({ id: Playlist.id }).from(Playlist).where(eq(Playlist.id, id)))[0]
    if (list) {
        return new Response("OK")
    }

    try {
        await db.insert(Playlist).values({
            id,
            images,
            name,
            description,
            owner,
            followers,
            songs,
        })
    } catch (err) {
        console.warn("Error in new-playlist", err?.toString())
        console.log(data)
    }

    return new Response("OK")
}