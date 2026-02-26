import { z } from "zod";

export const ArtistSearchResultsItemSchema = z.object({
    name: z.string(),
    url: z.string(),
});

export type ArtistSearchResultsItem = z.infer<
    typeof ArtistSearchResultsItemSchema
>;
