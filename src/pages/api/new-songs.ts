import { db } from "@/lib/db/db";
import type { ImageDB } from "@/lib/db/image";
import { ENV } from "@/rockitEnv";
import type { APIContext } from "astro";
import * as fs from "fs/promises";
import * as crypto from "node:crypto";
import { join } from "path";

export async function POST(context: APIContext): Promise<Response> {
    if (
        context.request.headers.get("authorization") != `Bearer ${ENV.API_KEY}`
    ) {
        return new Response("Incorrect API key", { status: 401 });
    }
    const data = await context.request.json();

    Promise.all(
        data.map(async (dataSong: any) => {
            let name = dataSong.name;
            let artists = JSON.stringify(dataSong.artists);
            let genres = JSON.stringify(dataSong.genres);
            let discNumber = dataSong.disc_number;
            let albumName = dataSong.album_name;
            let albumArtists = JSON.stringify(dataSong.album_artists);
            let albumType = dataSong.album_type;
            let duration = dataSong.duration;
            let date = dataSong.date;
            let trackNumber = dataSong.track_number;
            let id = dataSong.song_id;
            let publisher = dataSong.publisher;
            let downloadUrl = dataSong.download_url;
            let lyrics = dataSong.lyrics;
            let popularity = dataSong.popularity;
            let albumId = dataSong.album_id;
            let path = dataSong.path;
            let images = JSON.stringify(dataSong.images);
            let image = dataSong.image;
            let copyright = dataSong.copyright;

            try {
                await fs.stat(join(ENV.SONGS_PATH, path));
            } catch {
                console.log(`${path} not found`);
                return;
            }

            console.log(`Inserting/Updating ${path}`);

            let imageId;

            const imageDB = db
                .prepare("SELECT * FROM image WHERE path = ?")
                .get(image) as ImageDB;
            if (imageDB) {
                imageId = imageDB.id;
            } else {
                imageId = crypto.randomBytes(20).toString("hex");
                db.prepare(
                    "INSERT INTO image (id, path, url) VALUES(?, ?, ?)"
                ).run(
                    imageId,
                    image,
                    `https://rockit.rockhosting.org/api/image/${imageId}`
                );
            }

            const song = db.prepare("SELECT * FROM song WHERE id = ?").get(id);

            if (song) {
                if (lyrics != null) {
                    db.prepare(`UPDATE song SET lyrics = ? WHERE id = ?`).run(
                        lyrics,
                        id
                    );
                }
                db.prepare(`UPDATE song SET path = ? WHERE id = ?`).run(
                    path,
                    id
                );
                if (JSON.parse(genres).length > 0) {
                    db.prepare(`UPDATE song SET genres = ? WHERE id = ?`).run(
                        genres,
                        id
                    );
                }
                if (JSON.parse(images).length > 0) {
                    db.prepare(`UPDATE song SET images = ? WHERE id = ?`).run(
                        images,
                        id
                    );
                }
                if (downloadUrl != null) {
                    db.prepare(
                        `UPDATE song SET downloadUrl = ? WHERE id = ?`
                    ).run(downloadUrl, id);
                }
                if (imageId) {
                    db.prepare(`UPDATE song SET image = ? WHERE id = ?`).run(
                        imageId,
                        id
                    );
                }
                return new Response("OK");
            }

            try {
                db.prepare(
                    "INSERT INTO song (id, name, artists, genres, discNumber, albumName, albumArtist, albumType, albumId, duration, date, trackNumber, publisher, path, image, images, copyright, downloadUrl, lyrics, popularity, dateAdded) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
                ).run(
                    id,
                    name,
                    artists,
                    genres,
                    discNumber,
                    albumName,
                    albumArtists,
                    albumType,
                    albumId,
                    duration,
                    date,
                    trackNumber,
                    publisher,
                    path,
                    imageId,
                    images,
                    copyright,
                    downloadUrl,
                    lyrics,
                    popularity,
                    new Date().getTime()
                );
            } catch (err) {
                console.log(data);
                console.warn("Error in new-song", err?.toString());
            }
        })
    );

    return new Response("OK");
}
