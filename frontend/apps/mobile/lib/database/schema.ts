import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    publicId: text("public_id").notNull().unique(),
    username: text("username").notNull().unique(),
    passwordHash: text("password_hash"),
    provider: text("provider"),
    providerAccountId: text("provider_account_id"),
    currentStation: text("current_station"),
    currentTimeMs: integer("current_time_ms"),
    currentQueueMediaId: integer("current_queue_media_id"),
    queueTypeKey: integer("queue_type_key").notNull().default(2),
    repeatModeKey: integer("repeat_mode_key").notNull().default(1),
    volume: real("volume").notNull().default(1),
    crossFadeMs: integer("cross_fade_ms").notNull().default(0),
    langId: integer("lang_id").notNull().default(1),
    admin: integer("admin", { mode: "boolean" }).notNull().default(false),
    superAdmin: integer("super_admin", { mode: "boolean" })
        .notNull()
        .default(false),
    imageId: integer("image_id"),
    dateUpdated: integer("date_updated"),
    dateAdded: integer("date_added"),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export const media = sqliteTable("media", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    publicId: text("public_id").notNull().unique(),

    providerId: integer("provider_id").notNull(),
    provider: text("provider").notNull(),

    mediaTypeKey: integer("media_type_key").notNull(),
    mediaType: text("media_type").notNull(),

    name: text("name").notNull(),
    url: text("url"),
    providerUrl: text("provider_url"),

    imageUrl: text("image_url"),

    durationMs: integer("duration_ms"),

    audioSrc: text("audio_src"),
    videoSrc: text("video_src"),

    artists: text("artists"),
    albumPublicId: text("album_public_id"),
    albumName: text("album_name"),

    releaseDate: text("release_date"),
    discNumber: integer("disc_number"),
    trackNumber: integer("track_number"),

    downloaded: integer("downloaded", { mode: "boolean" })
        .notNull()
        .default(false),
    localFilePath: text("local_file_path"),
    localImagePath: text("local_image_path"),

    dateUpdated: integer("date_updated"),
    dateAdded: integer("date_added"),
});

export type Media = typeof media.$inferSelect;
export type NewMedia = typeof media.$inferInsert;

export const libraryMedia = sqliteTable("library_media", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id").notNull(),
    mediaId: integer("media_id").notNull(),
    libraryType: text("library_type").notNull(),
    dateAdded: integer("date_added"),
});

export type LibraryMedia = typeof libraryMedia.$inferSelect;
export type NewLibraryMedia = typeof libraryMedia.$inferInsert;

export const libraryTypeLiked = "liked";
export const libraryTypeDownloaded = "downloaded";
export const libraryTypeRecent = "recent";

export const playlists = sqliteTable("playlists", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    publicId: text("public_id").notNull().unique(),
    userId: integer("user_id").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    imageUrl: text("image_url"),
    owner: text("owner").notNull(),
    provider: text("provider").notNull(),
    isPublic: integer("is_public", { mode: "boolean" })
        .notNull()
        .default(false),
    dateUpdated: integer("date_updated"),
    dateAdded: integer("date_added"),
});

export type Playlist = typeof playlists.$inferSelect;
export type NewPlaylist = typeof playlists.$inferInsert;

export const playlistMedia = sqliteTable("playlist_media", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    playlistId: integer("playlist_id").notNull(),
    mediaId: integer("media_id").notNull(),
    position: integer("position").notNull(),
    dateAdded: integer("date_added"),
});

export type PlaylistMedia = typeof playlistMedia.$inferSelect;
export type NewPlaylistMedia = typeof playlistMedia.$inferInsert;

export const queue = sqliteTable("queue", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id").notNull(),
    mediaId: integer("media_id").notNull(),
    mediaPublicId: text("media_public_id").notNull(),
    queueMediaId: integer("queue_media_id").notNull(),
    queueType: text("queue_type").notNull().default("normal"),
    position: integer("position").notNull(),
    dateAdded: integer("date_added"),
});

export type Queue = typeof queue.$inferSelect;
export type NewQueue = typeof queue.$inferInsert;

export const statsSummary = sqliteTable("stats_summary", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id").notNull(),
    range: text("range").notNull(),
    songsListened: integer("songs_listened").notNull().default(0),
    minutesListened: real("minutes_listened").notNull().default(0),
    avgMinutesPerSong: real("avg_minutes_per_song").notNull().default(0),
    dateUpdated: integer("date_updated"),
});

export type StatsSummary = typeof statsSummary.$inferSelect;
export type NewStatsSummary = typeof statsSummary.$inferInsert;

export const statsTopItem = sqliteTable("stats_top_item", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id").notNull(),
    range: text("range").notNull(),
    statsType: text("stats_type").notNull(),
    mediaPublicId: text("media_public_id").notNull(),
    name: text("name").notNull(),
    imageUrl: text("image_url"),
    value: integer("value").notNull(),
    position: integer("position").notNull(),
    dateUpdated: integer("date_updated"),
});

export type StatsTopItem = typeof statsTopItem.$inferSelect;
export type NewStatsTopItem = typeof statsTopItem.$inferInsert;

export const mediaListened = sqliteTable("media_listened", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id").notNull(),
    mediaPublicId: text("media_public_id").notNull(),
    durationMs: integer("duration_ms").notNull(),
    listenedAt: integer("listened_at").notNull(),
    synced: integer("synced", { mode: "boolean" }).notNull().default(false),
});

export type MediaListened = typeof mediaListened.$inferSelect;
export type NewMediaListened = typeof mediaListened.$inferInsert;

export const vocabulary = sqliteTable("vocabulary", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    langId: integer("lang_id").notNull(),
    key: text("key").notNull(),
    value: text("value").notNull(),
});

export type Vocabulary = typeof vocabulary.$inferSelect;
export type NewVocabulary = typeof vocabulary.$inferInsert;

export const pendingMessages = sqliteTable("pending_messages", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    type: text("type").notNull(),
    payload: text("payload").notNull(),
    timestampMs: integer("timestamp_ms").notNull(),
    createdAt: integer("created_at").notNull(),
    synced: integer("synced", { mode: "boolean" }).notNull().default(false),
});

export type PendingMessage = typeof pendingMessages.$inferSelect;
export type NewPendingMessage = typeof pendingMessages.$inferInsert;

export const sessions = sqliteTable("sessions", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    publicId: text("public_id").notNull().unique(),
    userId: integer("user_id").notNull(),
    expiresAt: integer("expires_at").notNull(),
    dateAdded: integer("date_added"),
});

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

export const artists = sqliteTable("artists", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    publicId: text("public_id").notNull().unique(),
    name: text("name").notNull(),
    imageUrl: text("image_url"),
    localImagePath: text("local_image_path"),
    provider: text("provider"),
    url: text("url"),
    providerUrl: text("provider_url"),
    dateUpdated: integer("date_updated"),
    dateAdded: integer("date_added"),
});

export type Artist = typeof artists.$inferSelect;
export type NewArtist = typeof artists.$inferInsert;

export const downloads = sqliteTable("downloads", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    publicId: text("public_id").notNull().unique(),
    groupId: text("group_id").notNull(),
    userId: integer("user_id").notNull(),
    mediaPublicId: text("media_public_id").notNull(),
    title: text("title"),
    subtitle: text("subtitle"),
    imageUrl: text("image_url"),
    status: text("status").notNull(),
    progress: integer("progress").notNull().default(0),
    message: text("message"),
    dateAdded: integer("date_added"),
    dateUpdated: integer("date_updated"),
});

export type Download = typeof downloads.$inferSelect;
export type NewDownload = typeof downloads.$inferInsert;
