import type { APIContext } from "astro";
import { db, Song, eq } from 'astro:db';


export async function POST(context: APIContext): Promise<Response> {

    const data = await context.request.json()

    let name = data.name
    let artists = data.artists
    let genres = data.genres
    let disc_number = data.disc_number
    let album_name = data.album_name
    let album_artists = data.album_artists
    let album_type = data.album_type
    let duration = data.duration
    let year = data.year
    let date = data.date
    let track_number = data.track_number
    let tracks_count = data.tracks_count
    let song_id = data.song_id
    let publisher = data.publisher
    let download_url = data.download_url
    let lyrics = data.lyrics
    let popularity = data.popularity
    let album_id = data.album_id
    let path = data.path
    let images = data.images
    let copyright = data.copyright


    const song = (await db.select({ song_id: Song.song_id }).from(Song).where(eq(Song.song_id, song_id)))[0]

    if (song) {
        await db.update(Song).set({path: path})
        return new Response("OK")
    }

    try {
        await db.insert(Song).values({
            name,
            artists,
            genres,
            disc_number,
            album_name,
            album_artists,
            album_type,
            album_id,
            duration,
            year,
            date,
            track_number,
            tracks_count,
            song_id,
            publisher,
            path,
            images,
            copyright,
            download_url,
            lyrics,
            popularity,
        })
    } catch (err) {
        console.warn("Error in new-song", err?.toString())
        console.log(data)
    }

    return new Response("OK")
}