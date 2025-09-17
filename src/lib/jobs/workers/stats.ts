import { Worker } from "bullmq";
import { getStats } from "@/lib/stats";
import { ApiStats } from "@/app/api/stats/route";
import { connection } from "@/lib/jobs/connection";

new Worker(
    "stats",
    async (job) => {
        const {
            userId,
            startString,
            endString,
            url,
        }: {
            userId: string;
            startString: string;
            endString: string;
            url: string;
        } = job.data;

        const parametersUrl = new URL(url, "http://localhost");

        const start = startString ? new Date(startString).getTime() : undefined;
        const end = endString ? new Date(endString).getTime() : undefined;

        let limit: string | number | undefined =
            parametersUrl.searchParams?.get("limit") ?? "10";

        const sortBy:
            | "timePlayed"
            | "timesPlayed"
            | "random"
            | "neverPlayed"
            | "popular"
            | undefined =
            (parametersUrl.searchParams?.get("sortBy") as
                | "timePlayed"
                | "timesPlayed"
                | "random"
                | "neverPlayed"
                | "popular"
                | undefined) ?? undefined;

        if (
            sortBy &&
            ![
                "timesPlayed",
                "timePlayed",
                "random",
                "neverPlayed",
                "popular",
            ].includes(sortBy)
        ) {
            throw new Error("Invalid sortBy parameter");
        }

        const type: "songs" | "artists" | "albums" | undefined =
            parametersUrl.searchParams?.get("type") as
                | "songs"
                | "artists"
                | "albums"
                | undefined;

        if (type && !["songs", "artists", "albums"].includes(type)) {
            throw new Error("Invalid type parameter");
        }

        if (type == "albums" && sortBy == "timePlayed") {
            throw new Error("Invalid sortBy for albums");
        }

        const noRepeat: boolean | undefined =
            parametersUrl.searchParams?.get("noRepeat") === "true"
                ? true
                : undefined;

        const stats = (await getStats(userId, start, end)).stats as ApiStats;

        stats.songs.map((song) => {
            const result = stats.songs.find(
                (findSong) => findSong.id == song.id
            );
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
            } else if (sortBy === "neverPlayed") {
                return (a.timesPlayed ?? 0) - (b.timesPlayed ?? 0);
            } else if (sortBy === "popular") {
                return (b.timesPlayed ?? 0) - (a.timesPlayed ?? 0);
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
            return stats[type].slice(0, limit);
        }

        return {
            artists: stats.artists.slice(0, limit),
            albums: stats.albums.slice(0, limit),
            songs: stats.songs.slice(0, limit),
        };
    },
    { connection }
);
