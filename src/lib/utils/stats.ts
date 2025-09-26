
interface AlbumForStats extends AlbumDB<"name" | "id" | "artists" | "image"> {
    timesPlayed: number;
    index: number;
}

interface ArtistForStats extends ArtistDB {
    timesPlayed: number;
    index: number;
}

export interface SongForStats
    extends SongDB<
        | "id"
        | "name"
        | "image"
        | "artists"
        | "albumId"
        | "albumName"
        | "duration"
    > {
    timePlayed: number | string;
    timesPlayed: number;
    index: number;
}

export interface Stats {
    songs: SongForStats[];
    artists: ArtistForStats[];
    albums: AlbumForStats[];
}

export async function getStats(
    userId: string,
    start?: number | undefined,
    end?: number | undefined
): Promise<{
    stats: Stats;
    newStart: string;
    newEnd: string;
}> {
    // **************************
    // Replace with SELECT lastPlayedSong FROM user WHERE id = ?     context.locals.user.id
    // const fileBuffer = await readFile("lastPlayedSongs.json", "utf-8");
    // const lastPlayedSongs: {
    //     [key: string]: number[];
    // } = JSON.parse(fileBuffer);

    const lastPlayedSongs = parseUser(
        db
            .prepare("SELECT lastPlayedSong FROM user WHERE id = ?")
            .get(userId) as RawUserDB
    )?.lastPlayedSong;

    // **************************

    let songs: SongDB<
        | "artists"
        | "id"
        | "name"
        | "duration"
        | "albumId"
        | "albumName"
        | "image"
    >[] = [];

    if (!lastPlayedSongs) {
        return {
            stats: { songs: [], artists: [], albums: [] },
            newStart: "",
            newEnd: "",
        };
    }

    Array(Math.floor(Object.keys(lastPlayedSongs).length / 900) + 1)
        .fill(0)
        .map((_, index) => {
            const query =
                "SELECT id,artists,duration,name,albumId,albumName,image FROM song WHERE id = " +
                Object.keys(lastPlayedSongs)
                    .splice(index * 900, (index + 1) * 900)
                    .map((key) => `'${key}'`)
                    .join(" OR id = ");

            const tempSongs = (db.prepare(query).all() as RawSongDB[]).map(
                (song) =>
                    parseSong(song) as SongDB<
                        | "artists"
                        | "id"
                        | "name"
                        | "duration"
                        | "albumId"
                        | "albumName"
                        | "image"
                    >
            );
            songs = [...songs, ...tempSongs];
        });

    const out: Stats = { songs: [], artists: [], albums: [] };

    // let notInDatabase = [];

    // If start is not provided, start will be set to the first date in the lastPlayedSongs
    // If end is not provided, end will be set to the last date in the lastPlayedSongs
    let newStart: string = "";
    let newEnd: string = "";

    Object.entries(lastPlayedSongs).map((entry) => {
        entry[1].map((time) => {
            if (
                (start ? start < new Date(time).getTime() : true) &&
                (end ? new Date(time).getTime() < end : true)
            ) {
                if (
                    !newStart ||
                    new Date(time).getTime() < new Date(newStart).getTime()
                ) {
                    newStart = new Date(time).toISOString();
                }
                if (
                    !newEnd ||
                    new Date(time).getTime() > new Date(newEnd).getTime()
                ) {
                    newEnd = new Date(time).toISOString();
                }

                const song = songs.find((song) => song.id == entry[0]);
                if (song) {
                    out.songs.push({
                        artists: song.artists,
                        id: song.id,
                        timePlayed: time,
                        duration: song.duration,
                        name: song.name,
                        image: song.image,
                        albumId: song.albumId,
                        albumName: song.albumName,
                        timesPlayed: 1,
                        index: 0,
                    });
                    song.artists.map((artist) => {
                        const artistOut = out.artists.find(
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

                    const album = out.albums.find(
                        (album) => album.id == song.albumId
                    );
                    if (album) {
                        album.timesPlayed += 1;
                    } else {
                        out.albums.push({
                            artists: song.artists,
                            image: song.image as string, // song.image should always exist
                            index: 1,
                            name: song.albumName,
                            id: song.albumId,
                            timesPlayed: 1,
                        });
                    }
                } else {
                    // if (
                    //     !notInDatabase.includes(
                    //         `https://open.spotify.com/track/${entry[0]}`
                    //     )
                    // ) {
                    //     notInDatabase.push(
                    //         `https://open.spotify.com/track/${entry[0]}`
                    //     );
                    // }
                    // console.log("Song not in database", `https://open.spotify.com/track/${entry[0]}`)
                }
            }
        });
    });
    // console.log(notInDatabase);

    // // Write to the file
    // await writeFile("out.json", JSON.stringify(notInDatabase), (err) => {
    //     if (err) {
    //         console.error("Error writing to file:", err);
    //     } else {
    //         console.log("File successfully written to out.json");
    //     }
    // });

    const sortedAlbums = [...out.albums];
    sortedAlbums.sort((a, b) => b.timesPlayed - a.timesPlayed);
    out.albums.forEach((album) => {
        album.index = sortedAlbums.indexOf(album);
    });

    const sortedArtists = [...out.artists];
    sortedArtists.sort((a, b) => b.timesPlayed - a.timesPlayed);
    out.artists.forEach((artist) => {
        artist.index = sortedArtists.indexOf(artist);
    });

    out.songs.forEach((song) => {
        const firstSong = out.songs.find((_song) => _song.id == song.id);
        if (firstSong) firstSong.timesPlayed += 1;
    });

    out.songs.forEach((song) => {
        const firstSong = out.songs.find((_song) => _song.id == song.id);
        if (firstSong) song.timesPlayed = firstSong?.timesPlayed;
    });

    const sortedSongs = [...out.songs];
    sortedSongs.sort((a, b) => b.timesPlayed - a.timesPlayed);
    out.songs.forEach((song) => {
        song.index = sortedSongs.indexOf(song);
    });

    return { stats: out, newStart, newEnd };
}
