import type { SearchResults } from "@/types/spotify";
import type { APIContext } from "astro";
import { db } from "@/lib/db";

export async function GET(context: APIContext): Promise<Response> {
    const query = context.url.searchParams.get("q");
    let response;
    try {
        response = await fetch(`http://localhost:8000/search?q=${query}`);
    } catch {
        return new Response("Unable to fetch", { status: 404 });
    }
    const json = (await response.json()) as SearchResults;

    for (let index in json.songs) {
        const song = db
            .prepare("SELECT * FROM song WHERE id = ?")
            .get(json.songs[index].id);
        json.songs[index].inDatabase = song ? true : false;
    }

    for (let index in json.albums) {
        const album = db
            .prepare("SELECT * FROM album WHERE id = ?")
            .get(json.albums[index].id);
        json.albums[index].inDatabase = album ? true : false;
    }
    for (let index in json.playlists) {
        const playlist = db
            .prepare("SELECT * FROM playlist WHERE id = ?")
            .get(json.playlists[index].id);
        json.playlists[index].inDatabase = playlist ? true : false;
    }

    return new Response(JSON.stringify(json));
}
