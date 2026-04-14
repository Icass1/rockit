// This file is generated using: python3 -m backend zod
// Do not modify this file manually.

import { z } from "zod";
import { ArtistSearchResultsItemSchema } from "./artistSearchResultsItem";

export const BaseSearchResultsItemSchema = z.object({
    type: z.union([
        z.literal("album"),
        z.literal("playlist"),
        z.literal("artist"),
        z.literal("song"),
        z.literal("video"),
        z.literal("radio"),
    ]),
    searchResult: z.union([z.literal(true)]).default(true),
    name: z.string(),
    providerUrl: z.string(),
    imageUrl: z.string(),
    artists: z.array(z.lazy(() => ArtistSearchResultsItemSchema)),
    provider: z.string(),
});

export type BaseSearchResultsItem = z.infer<typeof BaseSearchResultsItemSchema>;
