// import sqlite from "better-sqlite3";
// export const db = sqlite("database/test-database.db");

import { db } from "./lib/db2/db";

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

console.log("==========================")
// console.log(db)
db