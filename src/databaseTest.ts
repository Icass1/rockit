// import sqlite from "better-sqlite3";
// export const db = sqlite("database/test-database.db");

import { album_images, albums, songs, spotify_images } from "./lib/db2/db";
import { getDatabaseDate } from "./lib/getTime";

console.log("==========================");

console.log(getDatabaseDate());

albums.insert(
    {
        id: "awefasdf",
        name: "ASDF",
        disc_count: 2,
        image: "imageid",
        release_date: "1942",
    },

    { ignoreIfExists: true }
);

spotify_images.insert(
    {
        url: "https://putopython.com",
        width: 600,
        height: 600,
        id: "imageida1",
    },

    { ignoreIfExists: true }
);

album_images.insert(
    {
        album_id: "awefasdf",
        image_id: "imageida1",
    },

    { ignoreIfExists: true }
);

songs.insert(
    [
        {
            id: "songid",
            name: "testname",
            album_id: "awefasdf",
            duration: 50,
            track_number: 1,
            disc_number: 1,
            isrc: "isrctest",
        },
        {
            id: "songid2",
            name: "testname2",
            album_id: "awefasdf",
            duration: 36,
            track_number: 2,
            disc_number: 1,
            isrc: "isrctest2",
        },
    ],
    { ignoreIfExists: true }
);

const song = songs.get("id", "songid");

console.log(song.album.date_added);
