// This file is generated using: python3 -m backend zod
// Do not modify this file manually.

import { z } from "zod";

export const ArtistSearchResultsItemSchema = z.object({
    name: z.string(),
    url: z.string(),
});

export type ArtistSearchResultsItem = z.infer<
    typeof ArtistSearchResultsItemSchema
>;
