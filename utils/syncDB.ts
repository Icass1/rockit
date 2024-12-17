import {
    db,
    parseSong,
    type ImageDB,
    type RawSongDB,
    type SongDB,
} from "@/lib/db";
import { ENV } from "@/rockitEnv";
import * as fs from "fs/promises";
import * as path from "path";

const END_POINT = "https://rockit.rockhosting.org";

// Define the upload function
async function uploadImages(images: ImageDB[]): Promise<void> {
    const formData = new FormData();
    console.log("Reading files");

    console.log(images.length);

    await Promise.all(
        images.map(async (image, index) => {
            if (!image || !image.path) {
                return;
            }
            const key = `file_${index}`;

            const songBuffer = await fs.readFile(
                path.join(ENV.IMAGES_PATH, image.path)
            );
            const blob = new Blob([songBuffer]);

            formData.append(key, blob);
            formData.append(`${key}_path`, image.path);
        })
    );
    console.log("Done");
    try {
        const response = await fetch(`${END_POINT}/api/upload-images`, {
            method: "POST",
            body: formData,
            headers: { Authorization: `Bearer ${ENV.API_KEY}` },
        });

        if (!response.ok) {
            throw new Error(`Upload failed: ${response.statusText}`);
        }

        const result = await response.json();
        console.log(result.message);
    } catch (error) {
        console.error("Error uploading files:", error);
    }
}

async function syncSongs(songs: SongDB[], images: ImageDB[]) {
    fetch(`${END_POINT}/api/new-songs`, {
        method: "POST",
        body: JSON.stringify(
            songs.map((song) => {
                console.log(song.name, song.albumArtist);

                const image = images.find((image) => image.id == song.image);
                if (!image) {
                    console.log("Image not found");
                    return;
                }
                return {
                    name: song.name,
                    artists: song.artists,
                    genres: song.genres,
                    disc_number: song.discNumber,
                    album_name: song.albumName,
                    album_artists: song.albumArtist,
                    album_type: song.albumType,
                    duration: song.duration,
                    date: song.date,
                    track_number: song.trackNumber,
                    song_id: song.id,
                    publisher: song.publisher,
                    download_url: song.downloadUrl,
                    lyrics: song.lyrics,
                    popularity: song.popularity,
                    album_id: song.albumId,
                    path: song.path,
                    images: song.images,
                    image: image.path,
                    copyright: song.copyright,
                };
            })
        ),
        headers: { Authorization: `Bearer ${ENV.API_KEY}` },
    });
}

async function uploadSongs(songs: SongDB[]) {
    const formData = new FormData();
    console.log("Reading files");
    await Promise.all(
        songs.map(async (song, index) => {
            console.log(song.name, song.albumArtist);
            if (!song || !song.path) {
                return;
            }
            const key = `file_${index}`;

            const songBuffer = await fs.readFile(
                path.join(ENV.SONGS_PATH, song.path)
            );
            const blob = new Blob([songBuffer]);

            formData.append(key, blob);
            formData.append(`${key}_path`, song.path);
        })
    );
    console.log("Done");

    try {
        const response = await fetch(`${END_POINT}/api/upload-songs`, {
            method: "POST",
            body: formData,
            headers: { Authorization: `Bearer ${ENV.API_KEY}` },
        });

        if (!response.ok) {
            throw new Error(`Upload failed: ${response.statusText}`);
        }

        const result = await response.json();
        console.log(result.message);
    } catch (error) {
        console.error("Error uploading files:", error);
    }
}

const images = db.prepare("SELECT * FROM image").all() as ImageDB[];

let songs = (db.prepare("SELECT * FROM song").all() as RawSongDB[])
    .map((rawSong) => parseSong(rawSong))
    .filter((song) => typeof song != "undefined");

songs = songs.map((song) => {
    let path = song.path?.startsWith("/")
        ? song.path.replace("/", "")
        : song.path;

    return { ...song, path };
});

let songFilesInDestination: string[] = [];
let songsInDestinationDB: string[] = [];
let imagesInDestinationDB: string[] = [];

let response = await fetch(`${END_POINT}/api/song-paths`, {
    headers: { Authorization: `Bearer ${ENV.API_KEY}` },
});
if (response.ok) {
    songFilesInDestination = await response.json();
}

response = await fetch(`${END_POINT}/api/songs-db`, {
    headers: { Authorization: `Bearer ${ENV.API_KEY}` },
});
if (response.ok) {
    songsInDestinationDB = await response.json();
}

response = await fetch(`${END_POINT}/api/images-db`, {
    headers: { Authorization: `Bearer ${ENV.API_KEY}` },
});
if (response.ok) {
    imagesInDestinationDB = await response.json();
}

// for (let i = 0; i < 10; i++) {
//     await uploadSongs(
//         songs
//             .filter((song) => {
//                 return typeof song != "undefined";
//             })
//             .filter((song) => {
//                 return song.path && !songFilesInDestination.includes(song.path);
//             })
//             .slice(i * 30, (i + 1) * 30)
//     );
// }

// syncSongs(
//     songs
//         .filter(
//             (song) =>
//                 !songsInDestinationDB.includes(song.id) &&
//                 song.path &&
//                 songFilesInDestination.includes(song.path)
//         )
//         .slice(0, 300),
//     images
// );

uploadImages(
    images
        .filter(
            (image) =>
                !imagesInDestinationDB.includes(image.path) &&
                image.path.startsWith("album/")
        )
        .slice(0, 100)
);
