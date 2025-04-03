import { type ImageDB } from "@/db/image";
import { db } from "@/db/db";
import * as crypto from "node:crypto";

export function updateSongDB({
    name,
    artists,
    genres,
    discNumber,
    albumName,
    albumArtists,
    albumType,
    duration,
    date,
    trackNumber,
    id,
    publisher,
    downloadUrl,
    lyrics,
    popularity,
    albumId,
    path,
    images,
    image,
    copyright,
}: {
    name: string;
    artists: string;
    genres: string;
    discNumber: string;
    albumName: string;
    albumArtists: string;
    albumType: string;
    duration: string;
    date: string;
    trackNumber: string;
    id: string;
    publisher: string;
    downloadUrl: string;
    lyrics: string;
    popularity: string;
    albumId: string;
    path: string;
    images: string;
    image: string;
    copyright: string;
}) {
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
        console.log({
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
        });
        console.warn("Error in new-song", err?.toString());
    }
}
