// This file is generated using: python3 -m backend zod
// Do not modify this file manually.

import { z } from "zod";
import { BaseSearchResultsItemSchema } from "./baseSearchResultsItem";

export const SearchResultsResponseSchema = z.object({
    results: z.array(z.lazy(() => BaseSearchResultsItemSchema)),
});

export type SearchResultsResponse = z.infer<typeof SearchResultsResponseSchema>;
