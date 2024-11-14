import type { SearchResults } from "@/types";
import type { APIContext } from "astro";
import { db, Song, Album, eq, Playlist } from 'astro:db';

export async function GET(context: APIContext): Promise<Response> {



    const query = context.url.searchParams.get("q")



    const response = await fetch(`http://localhost:8000/search?q=${query}`)
    const json = await response.json() as SearchResults





    for (let index in json.songs) {
        const song = (await db.select({ song_id: Song.song_id }).from(Song).where(eq(Song.song_id, json.songs[index].id)))[0]
        json.songs[index].inDatabase = song ? true : false
    }

    for (let index in json.albums) {
        const album = (await db.select({ id: Album.id }).from(Album).where(eq(Album.id, json.albums[index].id)))[0]
        json.albums[index].inDatabase = album ? true : false
    }
    for (let index in json.playlists) {
        const playlist = (await db.select({ id: Playlist.id }).from(Playlist).where(eq(Playlist.id, json.playlists[index].id)))[0]
        json.playlists[index].inDatabase = playlist ? true : false
    }

    // json.songs[0].inDatabase = true
    // json.albums[0].inDatabase = true




    return new Response(JSON.stringify(json))
}