import type { APIContext } from "astro";
import { db } from "@/lib/db";

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
    let path = "songs" + data.path;
    let images = JSON.stringify(data.images);
    let copyright = data.copyright;

    const song = db.prepare("SELECT * FROM song WHERE id = ?").get(id);

    if (song) {
        console.log("path", path, typeof path);

        if (lyrics != null) {
            db.prepare(`UPDATE song SET lyrics = ? WHERE id = ?`).run(
                lyrics,
                id
            );
        }
        // if (path != null) {
        db.prepare(`UPDATE song SET path = ? WHERE id = ?`).run(path, id);
        // }
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
        return new Response("OK");
    }

    try {
        db.prepare(
            "INSERT INTO song (id, name, artists, genres, discNumber, albumName, albumArtist, albumType, albumId, duration, year, date, trackNumber, tracksCount, publisher, path, images, copyright, downloadUrl, lyrics, popularity, dateAdded) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
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
