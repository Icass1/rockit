import { z } from "zod";
import { ProviderSearchResponseSchema } from "@/dto";

export const SearchResponseSchema = z.object({
    results: z.array(z.lazy(() => ProviderSearchResponseSchema)),
});

export type SearchResponse = z.infer<typeof SearchResponseSchema>;
