import type { APIContext } from "astro";
import { db, Song, Album, eq } from 'astro:db';


export async function POST(context: APIContext): Promise<Response> {

    const data = await context.request.json()

    let name = data.name
    let artists = data.artists
    let genres = data.genres
    let type = data.type
    let id = data.id
    let images = data.images
    let releaseDate = data.release_date
    let copyrights = data.copyrights
    let popularity = data.popularity
    let songs = data.songs
    let discCount = data.disc_count


    const list = (await db.select({ id: Album.id }).from(Album).where(eq(Album.id, id)))[0]
    if (list) {
        return new Response("OK")
    }

    try {
        await db.insert(Album).values({
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
        console.warn("Error in new-album", err?.toString())
        console.log(data)
    }

    return new Response("OK")
}