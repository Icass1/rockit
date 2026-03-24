import { z } from "zod";

const ArtistSearchResultsItemSchema = z.object({
    publicId: z.string(),
    name: z.string(),
});

export const BaseSearchResultsItemSchema = z.object({
    type: z.enum(["album", "playlist", "artist", "song", "video", "radio"]),
    title: z.string(),
    url: z.string(),
    imageUrl: z.string(),
    artists: z.array(ArtistSearchResultsItemSchema),
    provider: z.string(),
});

export const SearchResultsResponseSchema = z.object({
    results: z.array(z.lazy(() => BaseSearchResultsItemSchema)),
});

export type BaseSearchResultsItem = z.infer<typeof BaseSearchResultsItemSchema>;
export type SearchResultsResponse = z.infer<typeof SearchResultsResponseSchema>;
