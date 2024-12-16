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

const images = db.prepare("SELECT * FROM image").all() as ImageDB[];

const songs = (db.prepare("SELECT * FROM song").all() as RawSongDB[]).map(
    (rawSong) => parseSong(rawSong)
);

// Define the upload function
async function uploadImage(
    localImagePath: string,
    savePath: string,
    uploadUrl: string
): Promise<void> {
    try {
        // Read the image file from the local system
        const imageBuffer = await fs.readFile(localImagePath);
        const blob = new Blob([imageBuffer]);

        // Create a FormData instance
        const formData = new FormData();
        formData.append("image", blob, path.basename(localImagePath)); // Add file
        formData.append("path", savePath); // Add save path

        // Make the POST request to the upload route
        const response = await fetch(uploadUrl, {
            method: "POST",
            body: formData,
            headers: { Authorization: `Bearer ${ENV.API_KEY}` },
        });

        // Parse the response
        const result = await response.json();

        if (response.ok) {
            console.log("Image uploaded successfully:", result);
        } else {
            console.error("Failed to upload image:", result);
        }
    } catch (error) {
        console.error("Error uploading image:", error);
    }
}

async function uploadSong(
    localSongPath: string,
    savePath: string,
    uploadUrl: string
) {
    try {
        // Read the image file from the local system
        const songBuffer = await fs.readFile(localSongPath);
        const blob = new Blob([songBuffer]);

        // Create a FormData instance
        const formData = new FormData();
        formData.append("song", blob, path.basename(localSongPath)); // Add file
        formData.append("path", savePath); // Add save path

        // Make the POST request to the upload route
        const response = await fetch(uploadUrl, {
            method: "POST",
            body: formData,
            headers: { Authorization: `Bearer ${ENV.API_KEY}` },
        });

        // Parse the response
        const result = await response.json();

        if (response.ok) {
            console.log("Song uploaded successfully:", result);
        } else {
            console.error("Failed to upload song:", result);
        }
    } catch (error) {
        console.error("Error uploading song:", error);
    }
}

async function syncSong(song: SongDB, imagePath: string, uploadUrl: string) {
    fetch(uploadUrl, {
        method: "POST",
        body: JSON.stringify({
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
            image: imagePath,
            copyright: song.copyright,
        }),
        headers: { Authorization: `Bearer ${ENV.API_KEY}` },
    });
}

let songsInDestination: string[] = [];

const response = await fetch("http://12.12.12.9:4321/api/song-paths", {
    headers: { Authorization: `Bearer ${ENV.API_KEY}` },
});

if (response.ok) {
    songsInDestination = await response.json();
}

// const song = songs[400];
// const image = images.find((image) => image.id == song?.image);
// if (song && image) {
//     console.log(song?.name, song?.artists);
//     await syncSong(song, image?.path, "http://12.12.12.9:4321/api/new-song");
// }

// images.map((image) => {
//     if (image) {
//         uploadImage(
//             path.join(ENV.IMAGES_PATH, image.path),
//             path.join(image.path),
//             "http://12.12.12.9:4321/api/new-image"
//         );
//     }
// });

await Promise.all(
    songs.map(async (song) => {
        if (song && song.path) {
            if (!songsInDestination.includes(song.path)) {
                console.log(`Uploading ${song.name} - ${song.albumName}`);
                await uploadSong(
                    path.join(ENV.SONGS_PATH, song.path),
                    path.join(song.path),
                    "http://12.12.12.9:4321/api/upload-song"
                );
            } else {
                console.log(`Skipping ${song.name} - ${song.albumName}`);
            }
        } else {
            console.error("song or song.path are undefined");
        }
    })
);
