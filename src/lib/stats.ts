import type { AlbumDB, ArtistDB, SongDB } from "./db";

interface AlbumWithTimesPlayed extends AlbumDB<"name" | "id"> {
    timesPlayed: number;
}

interface ArtistWithTimesPlayed extends ArtistDB {
    timesPlayed: number;
}
interface SongWithTimesPlayed
    extends SongDB<"artists" | "id" | "duration" | "name"> {
    timePlayed: number;
}

export function PlayedSongs(
    lastPlayedSongs: {
        [key: string]: number[];
    },
    songs: SongDB<
        "artists" | "id" | "duration" | "name" | "albumId" | "albumName"
    >[] = [],
    start: number,
    end: number
) {
    interface Out {
        songs: SongWithTimesPlayed[];
        artists: ArtistWithTimesPlayed[];
        albums: AlbumWithTimesPlayed[];
    }

    let out: Out = { songs: [], artists: [], albums: [] };

    Object.entries(lastPlayedSongs).map((entry) => {
        entry[1].map((time) => {
            if (start < time && time < end) {
                let song = songs.find((song) => song.id == entry[0]);
                if (song) {
                    out.songs.push({
                        artists: song.artists,
                        id: song.id,
                        timePlayed: time,
                        duration: song.duration,
                        name: song.name,
                    });
                    song.artists.map((artist) => {
                        let artistOut = out.artists.find(
                            (tempArtist) => tempArtist.id == artist.id
                        );
                        if (artistOut) {
                            artistOut.timesPlayed += 1;
                        } else {
                            out.artists.push({
                                name: artist.name,
                                id: artist.id,
                                timesPlayed: 1,
                            });
                        }
                    });

                    let album = out.albums.find(
                        (album) => album.id == song.albumId
                    );
                    if (album) {
                        album.timesPlayed += 1;
                    } else {
                        out.albums.push({
                            name: song.albumName,
                            id: song.albumId,
                            timesPlayed: 1,
                        });
                    }
                }
            }
        });
    });

    out.albums.sort((a, b) => b.timesPlayed - a.timesPlayed);
    out.artists.sort((a, b) => b.timesPlayed - a.timesPlayed);
    out.songs.sort((a, b) => a.timePlayed - b.timePlayed);

    return out;
}

// 1730361245000
// 1730324981000
// 1729513442000