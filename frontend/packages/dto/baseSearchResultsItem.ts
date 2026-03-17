import { ArtistSearchResultsItemSchema } from "@/dto";
import { z } from "zod";

export const BaseSearchResultsItemSchema = z.object({
    type: z.union([
        z.literal("album"),
        z.literal("playlist"),
        z.literal("artist"),
        z.literal("song"),
        z.literal("video"),
        z.literal("radio"),
    ]),
    title: z.string(),
    url: z.string(),
    imageUrl: z.string(),
    artists: z.array(z.lazy(() => ArtistSearchResultsItemSchema)),
    provider: z.string(),
});

export type BaseSearchResultsItem = z.infer<typeof BaseSearchResultsItemSchema>;
