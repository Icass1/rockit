import type { AlbumDB, ArtistDB, SongDB } from "./db";

interface AlbumForStats extends AlbumDB<"name" | "id"> {
    timesPlayed: number;
    index: number;
}

interface ArtistForStats extends ArtistDB {
    timesPlayed: number;
    index: number;
}
interface SongWithTimePlayed
    extends SongDB<"artists" | "id" | "duration" | "name"> {
    timePlayed: number;
}

export interface Stats {
    songs: SongWithTimePlayed[];
    artists: ArtistForStats[];
    albums: AlbumForStats[];
}

export function getStats(
    lastPlayedSongs: {
        [key: string]: number[];
    },
    songs: SongDB<
        "artists" | "id" | "duration" | "name" | "albumId" | "albumName"
    >[] = [],
    start: number,
    end: number
) {
    let out: Stats = { songs: [], artists: [], albums: [] };

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
                                index: 1,
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
                            index: 1,
                            name: song.albumName,
                            id: song.albumId,
                            timesPlayed: 1,
                        });
                    }
                } else {
                    // console.log("Song not in database", `https://open.spotify.com/track/${entry[0]}`)
                }
            }
        });
    });

    const sortedAlbums = [...out.albums];
    sortedAlbums.sort((a, b) => b.timesPlayed - a.timesPlayed);
    out.albums.map((album) => {
        album.index = sortedAlbums.indexOf(album);
    });

    const sortedArtists = [...out.artists];
    sortedArtists.sort((a, b) => b.timesPlayed - a.timesPlayed);
    out.artists.map((artist) => {
        artist.index = sortedArtists.indexOf(artist);
    });

    // out.artists.sort((a, b) => b.timesPlayed - a.timesPlayed);
    out.songs.sort((a, b) => a.timePlayed - b.timePlayed);

    return out;
}
