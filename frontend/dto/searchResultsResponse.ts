import { z } from "zod";
import { ProviderSearchResultsResponseSchema } from "@/dto";

export const SearchResultsResponseSchema = z.object({
    results: z.array(z.lazy(() => ProviderSearchResultsResponseSchema)),
});

export type SearchResultsResponse = z.infer<typeof SearchResultsResponseSchema>;
