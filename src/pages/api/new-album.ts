import type { APIContext } from "astro";
import { db, type ImageDB } from "@/lib/db";
import * as crypto from "node:crypto";

export async function POST(context: APIContext): Promise<Response> {
    const data = await context.request.json();

    let name = data.name;
    let artists = JSON.stringify(data.artists);
    let genres = JSON.stringify(data.genres);
    let type = data.type;
    let id = data.id;
    let images = JSON.stringify(data.images);
    let image = data.image;
    let releaseDate = data.release_date;
    let copyrights = JSON.stringify(data.copyrights);
    let popularity = data.popularity;
    let songs = JSON.stringify(data.songs);
    let discCount = data.disc_count;

    const album = db.prepare("SELECT * FROM album WHERE id = ?").get(id);

    let imageId;

    const imageDB = db
        .prepare("SELECT * FROM image WHERE path = ?")
        .get(image) as ImageDB;
    if (imageDB) {
        imageId = imageDB.id;
    } else {
        imageId = crypto.randomBytes(20).toString("hex");
        db.prepare("INSERT INTO image (id, path, url) VALUES(?, ?, ?)").run(
            imageId,
            image,
            `https://rockit.rockhosting.org/api/image/${imageId}`
        );
    }

    if (album) {
        if (image != null) {
            db.prepare(`UPDATE album SET image = ? WHERE id = ?`).run(
                imageId,
                id
            );
        }
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
