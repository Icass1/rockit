import type { APIContext } from "astro";
import { db, Song, List, eq } from 'astro:db';


export async function POST(context: APIContext): Promise<Response> {

    const data = await context.request.json()

    let name = data.name
    let artists = JSON.stringify(data.artists)
    let genres = JSON.stringify(data.genres)
    let type = data.type
    let id = data.id
    let images = JSON.stringify(data.images)
    let releaseDate = data.release_date
    let copyrights = JSON.stringify(data.copyrights)
    let popularity = data.popularity
    let songs = JSON.stringify(data.songs)
    let discCount = data.disc_count


    const list = (await db.select({ id: List.id }).from(List).where(eq(List.id, id)))[0]
    if (list) {
        return new Response("OK")
    }

    try {
        await db.insert(List).values({
            id,
            type,
            images,
            name,
            releaseDate,
            artists,
            copyrights,
            popularity,
            genres,
            songs,
            discCount,

        })
    } catch (err) {
        console.warn("Error in new-list", err?.toString())
        console.log(data)
    }

    return new Response("OK")
}