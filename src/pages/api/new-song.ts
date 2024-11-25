import type { APIContext } from "astro";
import { db, type ImageDB } from "@/lib/db";
import * as crypto from "node:crypto";

export async function POST(context: APIContext): Promise<Response> {
    const data = await context.request.json();

    let name = data.name;
    let artists = JSON.stringify(data.artists);
    let genres = JSON.stringify(data.genres);
    let discNumber = data.disc_number;
    let albumName = data.album_name;
    let albumArtists = JSON.stringify(data.album_artists);
    let albumType = data.album_type;
    let duration = data.duration;
    let year = data.year;
    let date = data.date;
    let trackNumber = data.track_number;
    let tracksCount = data.tracks_count;
    let id = data.song_id;
    let publisher = data.publisher;
    let downloadUrl = data.download_url;
    let lyrics = data.lyrics;
    let popularity = data.popularity;
    let albumId = data.album_id;
    let path = data.path;
    let images = JSON.stringify(data.images);
    let image = data.image;
    let copyright = data.copyright;

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

    const song = db.prepare("SELECT * FROM song WHERE id = ?").get(id);

    if (song) {
        if (lyrics != null) {
            db.prepare(`UPDATE song SET lyrics = ? WHERE id = ?`).run(
                lyrics,
                id
            );
        }
        db.prepare(`UPDATE song SET path = ? WHERE id = ?`).run(path, id);
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
            db.prepare(`UPDATE song SET downloadUrl = ? WHERE id = ?`).run(
                downloadUrl,
                id
            );
        }
        if (imageId) {
            db.prepare(`UPDATE song SET image = ? WHERE id = ?`).run(imageId, id);
        }
        return new Response("OK");
    }

    try {
        db.prepare(
            "INSERT INTO song (id, name, artists, genres, discNumber, albumName, albumArtist, albumType, albumId, duration, year, date, trackNumber, tracksCount, publisher, path, image, images, copyright, downloadUrl, lyrics, popularity, dateAdded) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
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
            year,
            date,
            trackNumber,
            tracksCount,
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
        console.warn("Error in new-song", err?.toString());
        console.log(data);
    }

    return new Response("OK");
}
