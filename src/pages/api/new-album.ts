import type { APIContext } from "astro";
import { db } from "@/lib/db";

export async function POST(context: APIContext): Promise<Response> {
    const data = await context.request.json();

    let name = data.name;
    let artists = JSON.stringify(data.artists);
    let genres = JSON.stringify(data.genres);
    let type = data.type;
    let id = data.id;
    let images = JSON.stringify(data.images);
    let releaseDate = data.release_date;
    let copyrights = JSON.stringify(data.copyrights);
    let popularity = data.popularity;
    let songs = JSON.stringify(data.songs);
    let discCount = data.disc_count;

    const album = db.prepare("SELECT * FROM album WHERE id = ?").get(id);
    if (album) {
        return new Response("OK");
    }

    try {
        db.prepare(
            "INSERT INTO album (id, type, images, name, releaseDate, artists, copyrights, popularity, genres, songs, discCount, dateAdded) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        ).run(
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
            new Date().getTime()
        );
    } catch (err) {
        console.warn("Error in new-album", err?.toString());
        console.log(data);
    }

    return new Response("OK");
}
