import type { APIContext } from "astro";
import { db, type ImageDB } from "@/lib/db";
import * as crypto from "node:crypto";

export async function POST(context: APIContext): Promise<Response> {
    const data = await context.request.json();

    let name = data.name;
    let id = data.id;
    let images = JSON.stringify(data.images);
    let image = data.image;
    let description = data.description;
    let followers = data.followers;
    let owner = data.owner;
    let songs = JSON.stringify(data.songs);

    const playlist = db.prepare("SELECT * FROM playlist WHERE id = ?").get(id);

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

    if (playlist) {
        if (image != null) {
            db.prepare(`UPDATE playlist SET image = ? WHERE id = ?`).run(
                imageId,
                id
            );
        }
        return new Response("OK");
    }

    try {
        db.prepare(
            "INSERT INTO playlist (id, images, name, description, owner, followers, songs, image) VALUES(?, ?, ?, ?, ?, ?, ?, ?)"
        ).run(id, images, name, description, owner, followers, songs, imageId);
    } catch (err) {
        console.warn("Error in new-playlist", err?.toString());
        console.log(data);
    }

    return new Response("OK");
}
