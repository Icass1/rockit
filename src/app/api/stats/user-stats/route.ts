import { getSession } from "@/lib/auth/getSession";
import { getStats } from "@/lib/stats";
import { NextResponse } from "next/server";

export interface UserStats {
    totalTimesPlayedSong: number;
    totalSecondsListened: number;
    albums: {
        id: string;
        index: number;
        name: string;
        image: string;
        timesPlayed: number;
    }[];
    artists: {
        id: string;
        index: number;
        name: string;
        timesPlayed: number;
    }[];
    songs: {
        id: string;
        index: number;
        name: string;
        image: string | undefined;
        timesPlayed: number;
    }[];
    minutesListenedByRange: { start: string; end: string; minutes: number }[];
}

export async function GET(request: Request) {
    const session = await getSession();

    if (!session?.user) {
        return NextResponse.json(
            { error: "Not authenticated" },
            { status: 401 }
        );
    }

    const url = new URL(request.url);

    const startString: string | undefined =
        url.searchParams.get("start") ?? undefined;
    const endString: string | undefined =
        url.searchParams.get("end") ?? undefined;

    let start = startString ? new Date(startString).getTime() : undefined;
    let end = endString ? new Date(endString).getTime() : undefined;

    const { stats, newEnd, newStart } = await getStats(
        session?.user.id,
        start,
        end
    );

    if (!end) end = new Date(newEnd).getTime();
    if (!start) start = new Date(newStart).getTime();

    const out: UserStats = {
        totalTimesPlayedSong: stats.songs.length,
        totalSecondsListened: stats.songs.reduce(
            (acc, song) => acc + song.duration,
            0
        ),
        minutesListenedByRange: [],
        songs: [],
        albums: [],
        artists: [],
    };

    stats.songs.map((song) => {
        let outSong = out.songs.find((outSong) => outSong.id === song.id);

        if (!outSong) {
            outSong = {
                id: song.id,
                index: 0,
                name: song.name,
                image: song.image,
                timesPlayed: 1,
            };
            out.songs.push(outSong);
        } else {
            outSong.timesPlayed++;
        }
    });

    const maxGroups = 15;
    const minGroups = 1;

    const hours = Math.round((end - start) / 1000 / 60 / 60);

    let numberOfGroups;
    let groupLength;

    let found = false;

    for (let i = maxGroups; i > minGroups; i--) {
        numberOfGroups = hours / Math.ceil(hours / i);
        groupLength = hours / numberOfGroups;

        if (
            numberOfGroups == Math.floor(numberOfGroups) &&
            (24 / groupLength == Math.floor(24 / groupLength) ||
                groupLength / 24 == Math.floor(groupLength / 24))
        ) {
            found = true;
            break;
        }
    }

    if (!found) {
        console.error("Could not find a valid number of groups", {
            start,
            end,
            maxGroups,
            minGroups,
        });
    }
    if (numberOfGroups && groupLength) {
        for (let k = 0; k < numberOfGroups; k++) {
            const startGroup = new Date(
                start + k * groupLength * 60 * 60 * 1000
            );
            const endGroup = new Date(
                start + (k + 1) * groupLength * 60 * 60 * 1000
            );

            const groupSongs = stats.songs.filter((song) => {
                const songDate = new Date(song.timePlayed);
                return (
                    songDate.getTime() >= startGroup.getTime() &&
                    songDate.getTime() < endGroup.getTime()
                );
            });
            const groupSeconds = groupSongs.reduce(
                (acc, song) => acc + song.duration,
                0
            );
            out.minutesListenedByRange.push({
                start: startGroup.toISOString(),
                end: endGroup.toISOString(),
                minutes: Math.round(groupSeconds / 60),
            });
        }
    }

    // Albums
    out.albums = [...stats.albums];

    const albumsSorted = out.albums.sort(
        (a, b) => b.timesPlayed - a.timesPlayed
    );
    out.albums.forEach((album) => {
        album.index = albumsSorted.findIndex(
            (searchAlbum) => searchAlbum.id === album.id
        );
    });
    out.albums = out.albums.slice(0, 20);

    // Songs
    const songsSorted = out.songs.sort((a, b) => b.timesPlayed - a.timesPlayed);
    out.songs.forEach((song) => {
        song.index = songsSorted.findIndex(
            (searchSong) => searchSong.id == song.id
        );
    });

    out.songs = out.songs.slice(0, 20);

    // Artists
    out.artists = [...stats.artists];
    const artistsSorted = out.artists.sort(
        (a, b) => b.timesPlayed - a.timesPlayed
    );
    out.artists.forEach((artist) => {
        artist.index = artistsSorted.findIndex(
            (searchArtist) => searchArtist.id === artist.id
        );
    });
    out.artists = out.artists.slice(0, 20);

    return NextResponse.json(out);
}
