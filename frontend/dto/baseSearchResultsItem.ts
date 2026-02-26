import { z } from "zod";
import { ArtistSearchResultsItemSchema } from "@/dto";

export const BaseSearchResultsItemSchema = z.object({
    type: z.union([
        z.literal("album"),
        z.literal("playlist"),
        z.literal("artist"),
        z.literal("song"),
        z.literal("video"),
    ]),
    title: z.string(),
    url: z.string(),
    imageUrl: z.string(),
    artists: z.array(z.lazy(() => ArtistSearchResultsItemSchema)),
});

export type BaseSearchResultsItem = z.infer<typeof BaseSearchResultsItemSchema>;
