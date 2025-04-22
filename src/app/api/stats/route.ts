import { getSession } from "@/lib/auth/getSession";
import { getStats, SongWithTimePlayed, Stats } from "@/lib/stats";
import { NextResponse } from "next/server";

export interface ApiStats {
    albums: Stats["albums"];
    artists: Stats["artists"];
    songs: (SongWithTimePlayed & { timesPlayed?: number })[];
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

    const start = startString ? new Date(startString).getTime() : undefined;
    const end = endString ? new Date(endString).getTime() : undefined;

    let limit: string | number | undefined =
        url.searchParams.get("limit") ?? "10";

    const sortBy: "timePlayed" | "timesPlayed" | "random" | undefined =
        (url.searchParams.get("sortBy") as
            | "timePlayed"
            | "timesPlayed"
            | "random"
            | undefined) ?? undefined;

    if (sortBy && !["timesPlayed", "timePlayed", "random"].includes(sortBy)) {
        return NextResponse.json(
            { error: "Invalid sortBy parameter" },
            { status: 400 }
        );
    }

    const type: "songs" | "artists" | "albums" | undefined =
        url.searchParams.get("type") as
            | "songs"
            | "artists"
            | "albums"
            | undefined;

    if (type && !["songs", "artists", "albums"].includes(type)) {
        return NextResponse.json(
            { error: "Invalid type parameter" },
            { status: 400 }
        );
    }

    if (type == "albums" && sortBy == "timePlayed") {
        return NextResponse.json(
            { error: "Invalid type parameter" },
            { status: 400 }
        );
    }

    const noRepeat: boolean | undefined =
        url.searchParams.get("noRepeat") === "true" ? true : undefined;

    const stats = (await getStats(session?.user.id, start, end))
        .stats as ApiStats;

    stats.songs.map((song) => {
        const result = stats.songs.find((findSong) => findSong.id == song.id);
        if (result?.timesPlayed) {
            result.timesPlayed += 1;
        } else if (result) {
            result.timesPlayed = 1;
        }
    });

    stats.songs.sort((a, b) => {
        if (sortBy === "timePlayed") {
            return (
                new Date(b.timePlayed).getTime() -
                new Date(a.timePlayed).getTime()
            );
        } else if (sortBy === "random") {
            return Math.random() - 0.5;
        } else if (sortBy === "timesPlayed") {
            if (a.timesPlayed === undefined) {
                a.timesPlayed = 0;
            }
            if (b.timesPlayed === undefined) {
                b.timesPlayed = 0;
            }
            return b.timesPlayed - a.timesPlayed;
        }
        return 0;
    });

    stats.albums.sort((a, b) => {
        if (sortBy === "random") {
            return Math.random() - 0.5;
        } else if (sortBy === "timesPlayed") {
            return a.index - b.index;
        }
        return 0;
    });

    stats.artists.sort((a, b) => {
        if (sortBy === "random") {
            return Math.random() - 0.5;
        } else if (sortBy === "timesPlayed") {
            return a.index - b.index;
        }
        return 0;
    });

    if (noRepeat || sortBy === "timesPlayed") {
        stats.songs = [
            ...new Map(stats.songs.map((song) => [song.id, song])).values(),
        ];
    }

    if (limit == "0") limit = undefined;
    else limit = Number(limit);

    if (type) {
        return NextResponse.json(stats[type].slice(0, limit));
    }

    return NextResponse.json({
        artists: stats.artists.slice(0, limit),
        albums: stats.albums.slice(0, limit),
        songs: stats.songs.slice(0, limit),
    });
}
