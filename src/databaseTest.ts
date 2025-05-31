// import sqlite from "better-sqlite3";
// export const db = sqlite("database/test-database.db");

import {
    album_images,
    albums,
    downloads,
    songs,
    spotify_images,
    users,
} from "./lib/db2/db";
import { getDatabaseDate } from "./lib/getTime";

// const a = db
//     .prepare(
//         "SELECT artists.* FROM artists JOIN album_artists ON artists.id = album_artists.artist_id WHERE album_artists.album_id = ?"
//     )
//     .get("4X87hQ57jTYQTcYTaJWK5w");
// console.log(a);

// const b = db
//     .prepare(
//         `
// SELECT
//     songs.name AS song_name,
//     albums.name AS album_name,
//     albums.release_date AS release_date
// FROM
//     songs
// JOIN
//     albums ON songs.album_id = albums.id
// WHERE
//     songs.id = ?;
// `
//     )
//     .get("1hxbW2aQxmFSChaFeOeD5K");
// console.log(b);

console.log("==========================");

console.log(
    getDatabaseDate(
        "Sat May 31 2025 16:19:41 GMT+0200 (Central European Summer Time)"
    )
);

albums.insert(
    {
        id: "awefasdf",
        name: "ASDF",
        date_added: getDatabaseDate(),
        disc_count: 2,
        image: "imageid",
        release_date: "1942",
    },

    { ignoreIfExists: true }
);

spotify_images.insert({
    url: "https://putopython.com",
    width: 600,
    height: 600,
    id: "imageida1",
});

album_images.insert({
    album_id: "awefasdf",
    image_id: "imageida1",
});

songs.insert(
    [
        {
            id: "songid",
            name: "testname",
            album_id: "awefasdf",
            duration: 50,
            track_number: 1,
            disc_number: 1,
            date_added: getDatabaseDate(),
            isrc: "isrctest",
        },
        {
            id: "songid2",
            name: "testname2",
            album_id: "awefasdf",
            duration: 36,
            track_number: 2,
            disc_number: 1,
            date_added: getDatabaseDate(),
            isrc: "isrctest2",
        },
    ],
    { ignoreIfExists: true }
);

const song = songs.get("id", "songid");

console.log(song.album.album_images);
