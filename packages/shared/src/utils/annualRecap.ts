import type { StatsRankedItemResponse, UserStatsV2Response } from "@/dto";
import type { BaseHttp } from "@/http/baseHttp";
import type {
    AnnualRecap,
    AnnualRecapSlide,
} from "@/models/interfaces/annualRecap";

/** Calendar years, with an explicit UTC cutoff; the current year stays a preview. */
export function annualRecapRange(year: number, now = new Date()) {
    if (!Number.isInteger(year) || year < 2000 || year > now.getUTCFullYear())
        throw new RangeError("Invalid recap year");
    const start = new Date(Date.UTC(year, 0, 1));
    const calendarEnd = new Date(Date.UTC(year + 1, 0, 1));
    return {
        year,
        start: start.toISOString(),
        end: new Date(
            Math.min(now.getTime(), calendarEnd.getTime())
        ).toISOString(),
        inProgress: now < calendarEnd,
    };
}

const ranked = (items: StatsRankedItemResponse[]) =>
    items
        .filter((item) => item.value > 0)
        .slice()
        .sort(
            (a, b) =>
                b.value - a.value ||
                a.name.localeCompare(b.name) ||
                a.publicId.localeCompare(b.publicId)
        )
        .slice(0, 5);

/** Our own transparent editorial rules, not a claim to reproduce proprietary classifiers. */
export function buildAnnualRecap(
    stats: UserStatsV2Response,
    year: number,
    now = new Date()
): AnnualRecap {
    const range = annualRecapRange(year, now);
    const empty = stats.summary.totalPlayTimeMs <= 0;
    if (empty) return { ...range, empty: true, slides: [] };
    const minutes = Math.floor(stats.summary.totalPlayTimeMs / 60000);
    const songs = ranked(stats.topSongs),
        artists = ranked(stats.topArtists);
    const slides: AnnualRecapSlide[] = [
        {
            id: "intro",
            kind: "intro",
            titleKey: "RECAP_INTRO_TITLE",
            bodyKey: "RECAP_INTRO_BODY",
        },
        {
            id: "time",
            kind: "total",
            titleKey: "RECAP_TIME_TITLE",
            bodyKey: "RECAP_TIME_BODY",
            value: minutes,
            values: {
                days: stats.insights.activeDays,
                recordings: stats.summary.uniqueMediasListened,
            },
        },
    ];
    if (songs[0])
        slides.push({
            id: "top-song",
            kind: "song",
            titleKey: "RECAP_SONG_TITLE",
            bodyKey: "RECAP_SONG_BODY",
            item: songs[0],
        });
    if (songs.length)
        slides.push({
            id: "songs",
            kind: "songs",
            titleKey: "RECAP_SONGS_TITLE",
            bodyKey: "RECAP_RANKING_BODY",
            items: songs,
        });
    [...artists]
        .reverse()
        .forEach((item, index) =>
            slides.push({
                id: `artist-${item.publicId}`,
                kind: "artists",
                titleKey:
                    index === artists.length - 1
                        ? "RECAP_ARTIST_WINNER"
                        : "RECAP_ARTIST_COUNTDOWN",
                bodyKey: "RECAP_ARTIST_BODY",
                rank: artists.length - index,
                item,
            })
        );
    const insight: AnnualRecapSlide =
        stats.insights.longestStreak >= 14
            ? {
                  id: "insight",
                  kind: "insight",
                  titleKey: "RECAP_STREAK_TITLE",
                  bodyKey: "RECAP_STREAK_BODY",
                  value: stats.insights.longestStreak,
              }
            : stats.insights.discoveryCount >= 20
              ? {
                    id: "insight",
                    kind: "insight",
                    titleKey: "RECAP_DISCOVERY_TITLE",
                    bodyKey: "RECAP_DISCOVERY_BODY",
                    value: stats.insights.discoveryCount,
                }
              : {
                    id: "insight",
                    kind: "insight",
                    titleKey: "RECAP_RHYTHM_TITLE",
                    bodyKey: "RECAP_RHYTHM_BODY",
                    value: stats.insights.activeDays,
                };
    slides.push(insight);
    // Short ranges use day/week buckets. Never label a partial bucket as a whole month.
    const monthBuckets = stats.minutes
        .filter((bucket) => {
            const start = new Date(bucket.start),
                end = new Date(bucket.end);
            return (
                start.getUTCFullYear() === year &&
                start.toISOString() < range.end &&
                end.getUTCFullYear() * 12 +
                    end.getUTCMonth() -
                    start.getUTCFullYear() * 12 -
                    start.getUTCMonth() ===
                    1 &&
                start.getUTCDate() === 1 &&
                end.getUTCDate() === 1 &&
                end.getTime() - start.getTime() >= 28 * 86400000 &&
                bucket.minutes > 0
            );
        })
        .sort(
            (a, b) => b.minutes - a.minutes || a.start.localeCompare(b.start)
        );
    if (monthBuckets[0])
        slides.push({
            id: "month",
            kind: "month",
            titleKey: "RECAP_MONTH_TITLE",
            bodyKey: "RECAP_MONTH_BODY",
            month: new Date(monthBuckets[0].start).getUTCMonth(),
            value: Math.floor(monthBuckets[0].minutes),
        });
    slides.push({
        id: "summary",
        kind: "summary",
        titleKey: "RECAP_SUMMARY_TITLE",
        bodyKey: "RECAP_SUMMARY_BODY",
        value: minutes,
        item: artists[0],
        values: { days: stats.insights.activeDays },
    });
    return { ...range, empty: false, slides };
}

/** Uses the configured platform HTTP adapter, including its authentication and DTO validation. */
export async function loadAnnualRecap(
    http: Pick<typeof BaseHttp, "getUserStatsV2">,
    year: number,
    now = new Date()
): Promise<AnnualRecap> {
    const range = annualRecapRange(year, now);
    const response = await http.getUserStatsV2({
        range: "custom",
        start: range.start,
        end: range.end,
        timezoneOffsetMinutes: 0,
    });
    if (!response.isOk()) throw new Error(String(response.detail));
    return buildAnnualRecap(response.result, year, now);
}
