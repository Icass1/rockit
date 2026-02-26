import { z } from "zod";
import { BaseSearchResultsItemSchema } from "@/dto";

export const ProviderSearchResultsResponseSchema = z.object({
    provider: z.string(),
    items: z.array(z.lazy(() => BaseSearchResultsItemSchema)),
});

export type ProviderSearchResultsResponse = z.infer<
    typeof ProviderSearchResultsResponseSchema
>;
