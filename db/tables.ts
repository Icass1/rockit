import { defineTable, column, NOW } from "astro:db";

export const Song = defineTable({
    columns: {
        name: column.text(),
        artists: column.json(),
        genres: column.json(),
        disc_number: column.text({ optional: true }),
        album_name: column.text(),
        album_artists: column.json(),
        album_type: column.text(),
        album_id: column.text(),
        duration: column.number(),
        year: column.number(),
        date: column.text(),
        track_number: column.number({ optional: true }),
        tracks_count: column.number({ optional: true }),
        song_id: column.text({ unique: true, primaryKey: true }),
        publisher: column.text({ optional: true }),
        path: column.text({ unique: false, optional: false }),
        images: column.json(),
        copyright: column.text({ optional: true }),
        download_url: column.text({ optional: true }),
        lyrics: column.text({ optional: true }),
        popularity: column.number({ optional: true }),
        dateAdded: column.date({ default: NOW, nullable: true, optional: true }),
    }
})

export const Album = defineTable({
    columns: {
        id: column.text({primaryKey: true}),
        type: column.text(),
        images: column.json(),
        name: column.text(),
        releaseDate: column.text(),
        artists: column.json(),
        copyrights: column.json(),
        popularity: column.number(),
        genres: column.json(),
        songs: column.json(),
        discCount: column.number(),
        dateAdded: column.date({ default: NOW, nullable: true, optional: true }),
    }
})

export const Playlist = defineTable({
    columns: {
        id: column.text({primaryKey: true}),
        images: column.json(),
        name: column.text(),
        description: column.text(),
        owner: column.text(),
        followers: column.number(),
        songs: column.json()
    }
})

export const Session = defineTable({
    columns: {
        id: column.text({ primaryKey: true }),
        userId: column.text({ references: () => User.columns.id }),
        expiresAt: column.number(),
    },
});

export const User = defineTable({
    columns: {
        id: column.text({ primaryKey: true, optional: false }),
        username: column.text({ optional: false }),
        passwordHash: column.text({ optional: false }),
        lists: column.text({ optional: true }),
        lastPlayedSongs: column.text({ optional: true }),
        currentList: column.text({ optional: true }),
        currentSong: column.number({ optional: true }),
        currentTime: column.number({ optional: true }),
        queue: column.text({ optional: true }),
        queueIndex: column.number({ optional: true }),
        randomQueue: column.boolean({ default: true, optional: true }),
        volume: column.number({ default: 1, optional: true }),
        admin: column.boolean({ default: false, optional: true }),
        superAdmin: column.boolean({ default: false, optional: true }),
        devUser: column.boolean({ default: false, optional: true }),
        showLyrics: column.boolean({ default: false, optional: true }),
        updatedAt: column.date({ default: NOW, nullable: true, optional: true }),
        createdAt: column.date({ default: NOW, nullable: true, optional: true }),
    },
});
