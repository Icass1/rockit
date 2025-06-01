// Execute this file to setup database.

import { DB } from "@/lib/sqlWrapper";

export const db = new DB("database/database.db");

// ************************
// **** spotify_images ****
// ************************

const images = db.addTable("external_images");

const externalImageId = images.addColumn("id", {
    type: "TEXT",
    primaryKey: true,
    unique: true,
    notNull: true,
});
images.addColumn("url", { type: "TEXT", unique: true, notNull: true });
images.addColumn("width", { type: "INTEGER", notNull: true });
images.addColumn("height", { type: "INTEGER", notNull: true });

// ****************
// **** Albums ****
// ****************

const albums = db.addTable("albums");
const albumId = albums.addColumn("id", {
    type: "TEXT",
    primaryKey: true,
    unique: true,
});
albums.addColumn("image", { type: "TEXT", notNull: true });
albums.addColumn("name", { type: "TEXT", notNull: true });
albums.addColumn("release_date", { type: "DATE", notNull: true });
albums.addColumn("popularity", { type: "INTEGER" });
albums.addColumn("disc_count", { type: "INTEGER", notNull: true });
albums.addColumn("date_added", { type: db.NOW, notNull: true });

// **********************
// **** album_images ****
// **********************

const album_images = db.addTable("album_external_images");

const album_images_album_id = album_images
    .addColumn("album_id", { type: "TEXT", notNull: true })
    .setReference(albumId, "album");
const album_images_image_id = album_images
    .addColumn("image_id", { type: "TEXT", notNull: true })
    .setReference(externalImageId, "image");

album_images.setPrimaryKeys([album_images_album_id, album_images_image_id]);

// *****************
// **** artists ****
// *****************

const artists = db.addTable("artists");
const artistId = artists.addColumn("id", {
    type: "TEXT",
    primaryKey: true,
    unique: true,
});
artists.addColumn("name", { type: "TEXT", notNull: true });
artists.addColumn("genres", { type: "TEXT" });
artists.addColumn("followers", {
    type: "INTEGER",
});
artists.addColumn("popularity", {
    type: "INTEGER",
});
artists.addColumn("date_added", {
    type: db.NOW,
    notNull: true,
});
artists.addColumn("image", { type: "TEXT" });

// ***********************
// **** album_artists ****
// ***********************

const album_artists = db.addTable("album_artists");

const album_artists_album_id = album_artists
    .addColumn("album_id", { type: "TEXT" })
    .setReference(albumId, "album");
const album_artists_artist_id = album_artists
    .addColumn("artist_id", { type: "TEXT" })
    .setReference(artistId, "image");

album_artists.setPrimaryKeys([album_artists_album_id, album_artists_artist_id]);

// ***********************
// **** artist_images ****
// ***********************

const artist_images = db.addTable("artist_external_images");

const artist_images_artist_id = artist_images
    .addColumn("artist_id", { type: "TEXT" })
    .setReference(artistId, "album");
const artist_images_image_id = artist_images
    .addColumn("image_id", { type: "TEXT" })
    .setReference(externalImageId, "image");

artist_images.setPrimaryKeys([artist_images_artist_id, artist_images_image_id]);

// ***************
// **** Songs ****
// ***************
const songs = db.addTable("songs");

const songId = songs.addColumn("id", {
    type: "TEXT",
    primaryKey: true,
    unique: true,
    notNull: true,
});
songs.addColumn("name", { type: "TEXT", notNull: true });
songs.addColumn("duration", { type: "INTEGER", notNull: true });
songs.addColumn("track_number", { type: "INTEGER", notNull: true });
songs.addColumn("disc_number", { type: "INTEGER", notNull: true });
songs.addColumn("popularity", { type: "INTEGER" });
songs.addColumn("image", { type: "TEXT" });
songs.addColumn("path", { type: "TEXT" });
songs
    .addColumn("album_id", {
        type: "TEXT",
        notNull: true,
    })
    .setReference(albumId, "album");
songs.addColumn("date_added", { type: db.NOW, notNull: true });
songs.addColumn("isrc", {
    type: "TEXT",
    notNull: true,
    unique: true,
});
songs.addColumn("download_url", {
    type: "TEXT",
});
songs.addColumn("lyrics", {
    type: "TEXT",
});
songs.addColumn("dynamic_lyrics", {
    type: "TEXT",
});

// **********************
// **** song_artists ****
// **********************

const song_artists = db.addTable("song_artists");

const song_artists_song_id = song_artists
    .addColumn("song_id", { type: "TEXT" })
    .setReference(songId, "album");
const song_artists_artist_id = song_artists
    .addColumn("artist_id", { type: "TEXT" })
    .setReference(artistId, "image");

song_artists.setPrimaryKeys([song_artists_song_id, song_artists_artist_id]);

// **************
// **** users ****
// **************

const users = db.addTable("users");

const userId = users.addColumn("id", { type: "TEXT", primaryKey: true });
users.addColumn("username", { type: "TEXT", notNull: true, unique: true });
users.addColumn("password_hash", { type: "TEXT", notNull: true });
users
    .addColumn("current_song_id", { type: "TEXT" })
    .setReference(songId, "current_song");
users.addColumn("current_station", { type: "TEXT" });
users.addColumn("current_time", { type: "INTEGER" });
users.addColumn("queue_index", { type: "INTEGER" });
users.addColumn("random_queue", {
    type: "BOOLEAN",
    default: false,
    notNull: true,
});
users.addColumn("repeat_song", {
    type: "TEXT",
    default: "off",
    notNull: true,
    checkIn: ["off", "one", "all"],
});
users.addColumn("volume", { type: "INTEGER", notNull: true, default: 1 });
users.addColumn("cross_fade", { type: "INTEGER", default: 0, notNull: true });
users.addColumn("lang", { type: "TEXT", default: "en", notNull: true });
users.addColumn("admin", { type: "BOOLEAN", default: false, notNull: true });
users.addColumn("super_admin", {
    type: "BOOLEAN",
    default: false,
    notNull: true,
});
users
    .addColumn("impersonate_id", { type: "TEXT" })
    .setReference(userId, "impersonated_user");
users.addColumn("dev_user", { type: "BOOLEAN", default: false, notNull: true });
users.addColumn("date_added", { type: db.NOW, notNull: true });

// ********************
// **** user_lists ****
// ********************

const user_lists = db.addTable("user_lists");
user_lists
    .addColumn("user_id", {
        type: "TEXT",
        notNull: true,
        primaryKey: true,
    })
    .setReference(userId, "user");
user_lists.addColumn("item_type", {
    type: "TEXT",
    notNull: true,
    checkIn: ["playlist", "album"],
    primaryKey: true,
});
user_lists.addColumn("item_id", {
    type: "TEXT",
    notNull: true,
    primaryKey: true,
});
user_lists.addColumn("date_added", { type: db.NOW, notNull: true });

// ********************
// **** user_queue ****
// ********************

const user_queue = db.addTable("user_queue");
user_queue
    .addColumn("user_id", {
        type: "TEXT",
        notNull: true,
        primaryKey: true,
    })
    .setReference(userId, "user");
user_queue.addColumn("position", {
    type: "INTEGER",
    notNull: true,
    primaryKey: true,
});
user_queue
    .addColumn("song_id", {
        type: "TEXT",
        notNull: true,
        primaryKey: true,
    })
    .setReference(songId, "song");
user_queue.addColumn("list_type", {
    type: "TEXT",
    notNull: true,
    checkIn: ["album", "playlist", "recently-played"],
});
user_queue.addColumn("list_id", { type: "TEXT", notNull: true });

// ***************************
// **** user_pinned_lists ****
// ***************************

const user_pinned_lists = db.addTable("user_pinned_lists");

user_pinned_lists.addColumn("user_id", {
    type: "TEXT",
    notNull: true,
    primaryKey: true,
});
user_pinned_lists.addColumn("item_type", {
    type: "TEXT",
    notNull: true,
    primaryKey: true,
    checkIn: ["playlist", "album"],
});
user_pinned_lists.addColumn("item_id", {
    type: "TEXT",
    primaryKey: true,
    notNull: true,
});
user_pinned_lists.addColumn("date_added", { type: db.NOW, notNull: true });

// **************************
// **** user_liked_songs ****
// **************************

const user_liked_songs = db.addTable("user_liked_songs");

user_liked_songs
    .addColumn("user_id", {
        type: "TEXT",
        notNull: true,
        primaryKey: true,
    })
    .setReference(userId, "user");
user_liked_songs
    .addColumn("song_id", {
        type: "TEXT",
        notNull: true,
        primaryKey: true,
    })
    .setReference(songId, "song");
user_liked_songs.addColumn("date_added", { type: db.NOW, notNull: true });

// **************************
// **** user_song_history ****
// **************************

const user_song_history = db.addTable("user_song_history");

user_song_history
    .addColumn("user_id", {
        type: "TEXT",
        notNull: true,
        primaryKey: true,
    })
    .setReference(userId, "user");
user_song_history
    .addColumn("song_id", {
        type: "TEXT",
        notNull: true,
        primaryKey: true,
    })
    .setReference(songId, "song");
user_song_history.addColumn("played_at", { type: "DATE", notNull: true });

// *******************
// **** playlists ****
// *******************
const playlists = db.addTable("playlists");
const playlistId = playlists.addColumn("id", {
    type: "TEXT",
    primaryKey: true,
    unique: true,
    notNull: true,
});
playlists.addColumn("image", { type: "TEXT", notNull: true });
playlists.addColumn("name", { type: "TEXT", notNull: true });
playlists.addColumn("owner", { type: "TEXT", notNull: true });
playlists.addColumn("followers", { type: "INTEGER", notNull: true });
playlists.addColumn("date_added", { type: db.NOW, notNull: true });
playlists.addColumn("updated_at", { type: db.DATE_ON_UPDATE, notNull: true });

// *************************
// **** playlist_images ****
// *************************

const playlist_images = db.addTable("playlist_external_images");
playlist_images
    .addColumn("playlist_id", { type: "TEXT", primaryKey: true })
    .setReference(playlistId, "playlist");
playlist_images
    .addColumn("image_id", { type: "TEXT", primaryKey: true })
    .setReference(externalImageId, "image");

const playlist_songs = db.addTable("playlist_songs");
playlist_songs
    .addColumn("playlist_id", { type: "TEXT", primaryKey: true })
    .setReference(playlistId, "playlist");
playlist_songs
    .addColumn("song_id", { type: "TEXT", primaryKey: true })
    .setReference(songId, "song");
playlist_songs
    .addColumn("added_by", { type: "TEXT" })
    .setReference(userId, "user");
playlist_songs.addColumn("date_added", { type: db.NOW });

playlist_songs.addColumn("disabled", {
    type: "BOOLEAN",
    default: false,
    notNull: true,
});

// *******************
// **** downloads ****
// *******************

const downloads = db.addTable("downloads");

downloads.addColumn("id", { type: "TEXT", primaryKey: true });
downloads
    .addColumn("user_id", { type: "TEXT", notNull: true })
    .setReference(userId, "user");
downloads.addColumn("date_started", { type: "DATE", notNull: true });
downloads.addColumn("date_ended", { type: "DATE" });
downloads.addColumn("download_url", { type: "TEXT", notNull: true });
downloads.addColumn("status", { type: "TEXT", notNull: true });
downloads.addColumn("seen", {
    type: "BOOLEAN",
    notNull: true,
    default: false,
});
downloads.addColumn("success", { type: "INTEGER" });
downloads.addColumn("fail", { type: "INTEGER" });

// ***************
// **** errors ****
// ***************

const errors = db.addTable("errors");
errors.addColumn("id", {
    type: "TEXT",
    notNull: true,
    primaryKey: true,
    unique: true,
});
errors.addColumn("msg", { type: "TEXT" });
errors.addColumn("source", { type: "TEXT" });
errors.addColumn("line_no", { type: "INTEGER" });
errors.addColumn("column_no", { type: "INTEGER" });
errors.addColumn("error_message", { type: "TEXT" });
errors.addColumn("error_cause", { type: "TEXT" });
errors.addColumn("error_name", { type: "TEXT" });
errors.addColumn("error_stack", { type: "TEXT" });
errors.addColumn("user_id", { type: "TEXT" }).setReference(userId, "user");
errors.addColumn("date_added", { type: db.NOW, notNull: true });

db.tables.forEach((table) => console.log(table.getQuery()));

db.commit();

db.writeClassesToFile("src/lib/db/db.ts");
db.writePythonClassesToFile("backend/db/db.py");
