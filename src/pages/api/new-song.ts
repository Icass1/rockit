import type { APIContext } from "astro";
import { db, Song, sql, eq } from 'astro:db';


export async function POST(context: APIContext): Promise<Response> {

    const data = await context.request.json()

    let name = data.name
    let artists = JSON.stringify(data.artists)
    let artist = data.artist
    let genres = JSON.stringify(data.genres)
    let disc_number = data.disc_number
    let disc_count = data.disc_count
    let album_name = data.album_name
    let album_artist = data.album_artist
    let album_type = data.album_type
    let duration = data.duration
    let year = data.year
    let date = data.date
    let track_number = data.track_number
    let tracks_count = data.tracks_count
    let song_id = data.song_id
    let explicit = data.explicit
    let publisher = data.publisher
    let url = data.url
    let isrc = data.isrc
    let cover_url = data.cover_url
    let copyright_text = data.copyright_text
    let download_url = data.download_url
    let lyrics = data.lyrics
    let popularity = data.popularity
    let album_id = data.album_id
    let artist_id = data.artist_id
    let path = data.path

    const a = (await db.select({ song_id: Song.song_id }).from(Song).where(eq(Song.song_id, song_id)))[0]
    const b = (await db.select({ song_id: Song.song_id }).from(Song).where(eq(Song.path, path)))[0]

    if (a && b && a.song_id == b.song_id) {
        return new Response("OK")
    } else if (a || b) {
        console.warn("Some thing is wrong in database")
        console.warn("a", a)
        console.warn("b", b)
    }

    try {
        await db.insert(Song).values({
            name,
            artists,
            artist,
            genres,
            disc_number,
            disc_count,
            download_url,
            duration,
            date,
            album_artist,
            album_id,
            album_name,
            album_type,
            artist_id,
            copyright_text,
            cover_url,
            tracks_count,
            track_number,
            explicit,
            year,
            url,
            isrc,
            song_id,
            lyrics,
            publisher,
            popularity,
            path,
        })
    } catch (err) {

        console.warn("Error in new-song", err?.toString())
    }

    return new Response("OK")
}