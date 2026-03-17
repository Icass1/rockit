import { BaseSearchResultsItemSchema } from "@/dto";
import { z } from "zod";

export const SearchResultsResponseSchema = z.object({
    results: z.array(z.lazy(() => BaseSearchResultsItemSchema)),
});

export type SearchResultsResponse = z.infer<typeof SearchResultsResponseSchema>;
