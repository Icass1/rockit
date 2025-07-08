import { Worker } from "bullmq";
import { getStats } from "@/lib/stats";
import { reduce, shuffle } from "@/lib/arrayTools";
import { connection } from "@/lib/jobs/connection";

new Worker(
    "home-stats",
    async (job) => {
        const { userId } = job.data;
        const { stats } = await getStats(userId);

        const now = Date.now();
        const lastMonth = now - 1000 * 60 * 60 * 24 * 30;
        const lastThreeMonths = now - 1000 * 60 * 60 * 24 * 30 * 3;
        const lastYear = now - 1000 * 60 * 60 * 24 * 30 * 12;

        const songsByTimePlayed = reduce(
            stats.songs.toSorted(
                (b, a) =>
                    new Date(a.timePlayed).getTime() -
                    new Date(b.timePlayed).getTime()
            ),
            (item) => item.id
        ).slice(0, 40);

        const randomSongsLastMonth = shuffle(
            reduce(
                stats.songs.filter(
                    (song) => new Date(song.timePlayed).getTime() > lastMonth
                ),
                (item) => item.id
            )
        ).slice(0, 40);

        const hiddenGems = reduce(
            stats.songs.filter(
                (song) =>
                    new Date(song.timePlayed).getTime() < lastThreeMonths &&
                    new Date(song.timePlayed).getTime() > lastYear
            ),
            (item) => item.id
        ).slice(0, 40);

        return {
            songsByTimePlayed,
            randomSongsLastMonth,
            hiddenGems,
            songsForYou: [], // Canciones mas escuchadas de los ultimos 7 dias + recomendaciones
            communityTop: [], // Most listened songs by all RockIt users
            monthlyTop: [], // Most listened songs from last month
            // moodSongs: [],
        };
    },
    { connection }
);
