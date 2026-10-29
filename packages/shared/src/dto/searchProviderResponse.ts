// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";
import { BaseSearchResultsItemSchema } from "./baseSearchResultsItem";

export const SearchProviderResponseSchema = z.object({
    results: z.array(z.lazy(() => BaseSearchResultsItemSchema)),
    hasMoreTypes: z.array(z.string()).default([]),
});

export type SearchProviderResponse = z.infer<
    typeof SearchProviderResponseSchema
>;
