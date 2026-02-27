import { z } from "zod";
import { BaseSearchResultsItemSchema } from "@/dto";

export const SearchResultsResponseSchema = z.object({
    results: z.array(z.lazy(() => BaseSearchResultsItemSchema)),
});

export type SearchResultsResponse = z.infer<typeof SearchResultsResponseSchema>;
