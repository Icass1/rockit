import { BaseSongWithAlbumResponseSchema } from "@/dto";
import { z } from "zod";

// Handwritten feature contract composed from the application's existing song model.
export const RecommendationsSchema = z.object({
    songs: z.array(BaseSongWithAlbumResponseSchema),
    provider: z.enum(["local", "listenbrainz"]),
    externalStatus: z.enum([
        "off",
        "disabled",
        "unavailable",
        "no_matches",
        "active",
    ]),
});
export type Recommendations = z.infer<typeof RecommendationsSchema>;

export const recommendationLabels = {
    RECOMMENDATIONS_LOADING: "Finding songs for you…",
    RECOMMENDATIONS_EMPTY:
        "Add or download songs to get recommendations. Songs played in the last 24 hours are left out.",
    RECOMMENDATIONS_ERROR: "Recommendations are temporarily unavailable.",
    RECOMMENDATIONS_LOCAL:
        "Based on your listening and saved music. Ready to play from this server.",
    RECOMMENDATIONS_EXTERNAL_HELP:
        "Optional: enter your ListenBrainz username to use your latest public recommendation playlist. Only your username is sent; Rockit never uploads listening history. No token needed.",
    RECOMMENDATIONS_USERNAME: "ListenBrainz username",
    RECOMMENDATIONS_ENABLE: "Use ListenBrainz",
    RECOMMENDATIONS_DISABLE: "Use local recommendations",
    RECOMMENDATIONS_DISABLED:
        "ListenBrainz is disabled on this server. Local recommendations are ready.",
    RECOMMENDATIONS_UNAVAILABLE:
        "ListenBrainz is unavailable or has no usable playlist. Local recommendations are ready.",
    RECOMMENDATIONS_NO_MATCHES:
        "No ListenBrainz tracks matched playable songs here. Local recommendations are ready.",
    RECOMMENDATIONS_ACTIVE:
        "ListenBrainz matches, balanced with your local listening preferences.",
    RECOMMENDATIONS_OFFLINE:
        "Offline: showing recommendations saved on this device.",
    RECOMMENDATIONS_REFRESH: "Refresh recommendations",
} as const;
