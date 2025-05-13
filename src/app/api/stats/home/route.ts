import { getSession } from "@/lib/auth/getSession";
import { SongDB } from "@/lib/db/song";
import { getStats, SongForStats } from "@/lib/stats";
import { NextResponse } from "next/server";
// import { writeFile } from "fs";
import { reduce, shuffle } from "@/lib/arrayTools";

type SongsType = SongDB<
    "id" | "name" | "artists" | "albumId" | "albumName" | "duration" | "image"
>[];

export interface HomeStats {
    songsByTimePlayed: SongsType;
    randomSongsLastMonth: SongsType;
    nostalgicMix: SongsType;
    hiddenGems: SongsType;
    communityTop: SongsType;
    monthlyTop: SongsType;
    moodSongs: SongsType;
}

export async function GET() {
    const session = await getSession();

    if (!session?.user) {
        return NextResponse.json(
            { error: "Not authenticated" },
            { status: 401 }
        );
    }

    const { stats } = await getStats(session?.user.id);

    const uniqueTracks: SongForStats[] = [];
    const seenIds = new Set();

    for (const track of stats.songs) {
        if (!seenIds.has(track.id)) {
            seenIds.add(track.id);
            uniqueTracks.push(track);
        }
    }

    // writeFile(
    //     "delete.json",
    //     JSON.stringify(uniqueTracks, undefined, 4),
    //     (err) => {
    //         if (err) {
    //             console.error(err);
    //         } else {
    //             // file written successfully
    //         }
    //     }
    // );

    const lastMonthDate = new Date().getTime() - 1000 * 60 * 60 * 24 * 30;

    const lastSixMonthDate =
        new Date().getTime() - 1000 * 60 * 60 * 24 * 30 * 6;
    const lastTwoMonthDate =
        new Date().getTime() - 1000 * 60 * 60 * 24 * 30 * 6;
    const lastYearDate = new Date().getTime() - 1000 * 60 * 60 * 24 * 30 * 12;

    const out: HomeStats = {
        songsByTimePlayed: reduce(
            stats.songs.toSorted(
                (b, a) =>
                    new Date(a.timePlayed).getTime() -
                    new Date(b.timePlayed).getTime()
            ),
            (item) => item.id
        ).slice(0, 20),
        randomSongsLastMonth: shuffle(
            reduce(
                stats.songs.filter(
                    (song) =>
                        lastMonthDate < new Date(song.timePlayed).getTime()
                ),
                (item) => item.id
            )
        ).slice(0, 20),
        nostalgicMix: [],
        hiddenGems: reduce(
            stats.songs.filter(
                (song) =>
                    lastYearDate < new Date(song.timePlayed).getTime() &&
                    lastSixMonthDate > new Date(song.timePlayed).getTime() &&
                    typeof stats.songs.filter(
                        (_song) =>
                            _song.id == song.id &&
                            new Date(_song.timePlayed).getTime() >
                                lastTwoMonthDate
                    ) == "undefined"
            ),
            (item) => item.id
        )
            .toSorted(
                (b, a) =>
                    new Date(a.timesPlayed).getTime() -
                    new Date(b.timesPlayed).getTime()
            )
            .slice(0, 20),
        communityTop: [],
        monthlyTop: [],
        moodSongs: [],
    };

    return NextResponse.json(out);
}
