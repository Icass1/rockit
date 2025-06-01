import {
    artist_external_images,
    artists as artistsDB,
    albums as albumsDB,
    users as usersDB,
    songs as songsDB,
    playlists as playlistsDB,
    external_images,
    album_artists,
    album_external_images,
    song_artists,
    UsersType,
    user_queue,
    user_liked_songs,
    UserLikedSongsType,
    user_lists,
    user_pinned_lists,
    user_song_history,
    UserSongHistoryType,
    PlaylistsType,
    PlaylistSongsType,
    playlist_external_images,
    playlist_songs,
} from "./lib/db/db";
import { getDatabaseDate } from "./lib/getTime";

import sqlite from "better-sqlite3";

export interface RawArtistDB {
    id: string;
    images: string;
    name: string;
    genres: string;
    followers: number;
    popularity: number;
    type: string;
    dateAdded: string;
    image: string;
}

const oldDb = sqlite("database/back.database.2025.06.01.db", {
    readonly: true,
});
const albums = oldDb.prepare("SELECT * FROM album").all();
const artists = oldDb.prepare("SELECT * FROM artist").all();
const songs = oldDb.prepare("SELECT * FROM song").all();
const users = oldDb.prepare("SELECT * FROM user").all();
const playlists = oldDb.prepare("SELECT * FROM playlist").all();

const missingArtists: string[] = [];
const songsMissingIsrc: string[] = [];
const missingAlbums: string[] = [];
const missingSongs: string[] = [];

artists.forEach((artistDB: any) => {
    artistsDB.insert(
        {
            id: artistDB.id,
            name: artistDB.name,
            genres: artistDB.genres,
            followers: artistDB.followers,
            popularity: artistDB.popularity,
            image: artistDB.image,
        },
        { ignoreIfExists: true }
    );
    const images = JSON.parse(artistDB.images);

    images.forEach((image) => {
        const {
            url,
            width,
            height,
        }: { url: string; width: number; height: number } = image;

        const id: string | undefined = url.split("/").at(-1);
        if (!id) {
            console.error("Missing image", id);
            return;
        }
        external_images.insert(
            {
                id,
                url,
                width,
                height,
            },
            { ignoreIfExists: true }
        );

        artist_external_images.insert(
            {
                artist_id: artistDB.id,
                image_id: id,
            },
            { ignoreIfExists: true }
        );
    });
});

albums.forEach((albumDB: any) => {
    // console.log({ albumDB });

    albumsDB.insert(
        {
            id: albumDB.id,
            image: albumDB.image,
            name: albumDB.name,
            release_date: albumDB.releaseDate,
            popularity: albumDB.popularity,
            disc_count: albumDB.discCount,
        },
        { ignoreIfExists: true }
    );

    const artists = JSON.parse(albumDB.artists);
    artists.forEach((artist: { id: string }) => {
        try {
            album_artists.insert({
                album_id: albumDB.id,
                artist_id: artist.id,
            });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            if (error.toString().includes("FOREIGN KEY constraint failed")) {
                missingArtists.push(artist.id);
            }
        }
    });

    const images: any[] = JSON.parse(albumDB.images);
    images.forEach((image) => {
        const { url, width, height } = image;

        const id = url.split("/").at(-1);

        external_images.insert(
            {
                id,
                url,
                width,
                height,
            },
            { ignoreIfExists: true }
        );

        album_external_images.insert(
            {
                album_id: albumDB.id,
                image_id: id,
            },
            { ignoreIfExists: true }
        );
    });
});

songs.forEach((songDB: any) => {
    try {
        songsDB.insert(
            {
                id: songDB.id,
                name: songDB.name,
                duration: songDB.duration,
                track_number: songDB.trackNumber,
                disc_number: songDB.discNumber,
                popularity: songDB.popularity,
                image: songDB.image,
                path: songDB.path,
                album_id: songDB.albumId,
                isrc: songDB.isrc,
                download_url: songDB.downloadUrl,
                lyrics: songDB.lyrics,
                dynamic_lyrics: songDB.dynamicLyrics,
            },
            { ignoreIfExists: true }
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        if (error.toString().includes("FOREIGN KEY constraint failed")) {
            missingAlbums.push(songDB.albumId);
        }
    }

    const artists = JSON.parse(songDB.artists);
    artists.forEach((artist: { id: string }) => {
        try {
            song_artists.insert(
                {
                    artist_id: artist.id,
                    song_id: songDB.id,
                },
                { ignoreIfExists: true }
            );
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            if (error.toString().includes("FOREIGN KEY constraint failed")) {
                missingArtists.push(artist.id);
            }
        }
    });
});

export interface Queue {
    song: string;
    index: number;
    list: List;
}

export interface List {
    type: string;
    id: string;
}

users.forEach((userDB: any) => {
    const userToInsert: UsersType = {
        id: userDB.id,
        username: userDB.username,
        password_hash: userDB.passwordHash,
        current_song_id: userDB.currentSong,
        current_station: userDB.currentStation,
        current_time: userDB.currentTime,
        queue_index: userDB.queueIndex,
        random_queue: userDB.randomQueue == "1" ? true : false,
        repeat_song: userDB.repeatSong,
        volume: userDB.volume,
        cross_fade: userDB.crossFade,
        lang: userDB.lang,
        admin: userDB.admin == "1" ? true : false,
        super_admin: userDB.superAdmin == "1" ? true : false,
        dev_user: userDB.devUser == "1" ? true : false,
    };

    usersDB.insert(userToInsert, { ignoreIfExists: true });

    const queue: Queue[] = JSON.parse(userDB.queue);
    queue.forEach((item) => {
        try {
            user_queue.insert({
                user_id: userDB.id,
                position: item.index,
                song_id: item.song,
                list_id: item.list.id,
                list_type: item.list.type,
            });

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            if (error.toString().includes("FOREIGN KEY constraint failed")) {
                missingSongs.push(item.song);
            }
        }
    });

    const likedSongs = JSON.parse(userDB.likedSongs);
    likedSongs.forEach((song: any) => {
        const a: UserLikedSongsType = {
            song_id: song.id,
            date_added: getDatabaseDate(song.added_at),
            user_id: userDB.id,
        };
        try {
            user_liked_songs.insert(a);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            if (error.toString().includes("FOREIGN KEY constraint failed")) {
                missingSongs.push(song.id);
            }
        }
    });

    const userLists = JSON.parse(userDB.lists);

    userLists.forEach((userList) =>
        user_lists.insert(
            {
                user_id: userDB.id,
                item_id: userList.id,
                item_type: userList.type,
                date_added: getDatabaseDate(userList.createdAt),
            },
            { ignoreIfExists: true }
        )
    );

    const userPinnedLists: UserDBPinnedLists[] = JSON.parse(userDB.pinnedLists);

    userPinnedLists.forEach((userList) =>
        user_pinned_lists.insert(
            {
                user_id: userDB.id,
                item_id: userList.id,
                item_type: userList.type,
                date_added: getDatabaseDate(userList.createdAt),
            },
            { ignoreIfExists: true }
        )
    );

    const userHistory: { [key: string]: (number | string)[] } = JSON.parse(
        userDB.lastPlayedSong
    );

    Object.entries(userHistory).forEach((entry) => {
        entry[1].forEach((time) => {
            const a: UserSongHistoryType = {
                song_id: entry[0],
                user_id: userDB.id,
                played_at: getDatabaseDate(time),
            };
            try {
                user_song_history.insert(a, { ignoreIfExists: true });
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (error: any) {
                if (
                    error.toString().includes("FOREIGN KEY constraint failed")
                ) {
                    missingSongs.push(entry[0]);
                }
            }
        });
    });
});

playlists.forEach((playlistDB) => {
    const a: PlaylistsType = {
        id: playlistDB.id,
        name: playlistDB.name,
        owner: playlistDB.owner,
        followers: playlistDB.followers,
        image: playlistDB.image ?? undefined,
        date_added: getDatabaseDate(playlistDB.createdAt ?? new Date()),
    };

    playlistsDB.insert(a, { ignoreIfExists: true });
    const images: object[] = JSON.parse(playlistDB.images);

    images?.forEach((image) => {
        let { url, width, height } = image;

        if (
            url ==
                "https://i.scdn.co/image/ab67616d00001e02b2fb4238eaa37aad5e01ada1" ||
            url ==
                "https://image-cdn-fa.spotifycdn.com/image/ab67706c0000da8443ee594ee3c5c0572a155ca1"
        ) {
            (width = 300), (height = 300);
        }

        const id = url.split("/").at(-1);

        external_images.insert(
            {
                id,
                url,
                width,
                height,
            },
            { ignoreIfExists: true }
        );

        playlist_external_images.insert(
            {
                playlist_id: playlistDB.id,
                image_id: id,
            },
            { ignoreIfExists: true }
        );
    });

    const songs = JSON.parse(playlistDB.songs);

    songs.forEach((song: any) => {
        const a: PlaylistSongsType = {
            song_id: song.id,
            date_added: getDatabaseDate(song.added_at ?? new Date()),
            playlist_id: playlistDB.id,
        };
        try {
            playlist_songs.insert(a);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            if (error.toString().includes("FOREIGN KEY constraint failed")) {
                missingSongs.push(a.song_id);
            }
        }
    });
});

console.log(
    "missing artists:",
    missingArtists.reduce((acc: string[], id) => {
        if (!acc.includes(id)) {
            acc.push(id);
        }
        return acc;
    }, [])
);

console.log(
    "missing albums:",
    missingAlbums.reduce((acc: string[], id) => {
        if (!acc.includes(id)) {
            acc.push(id);
        }
        return acc;
    }, [])
);

console.log(
    "missing songs:",
    missingSongs.reduce((acc: string[], id) => {
        if (!acc.includes(id)) {
            acc.push(id);
        }
        return acc;
    }, [])
);

console.log(
    "songsMissingIsrc:",
    songsMissingIsrc.reduce((acc: string[], id) => {
        if (!acc.includes(id)) {
            acc.push(id);
        }
        return acc;
    }, [])
);
