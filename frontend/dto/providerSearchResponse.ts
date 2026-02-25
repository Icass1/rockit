import { z } from "zod";
import { BaseSearchItemSchema } from "./baseSearchItem";

export const ProviderSearchResponseSchema = z.object({
    provider: z.string(),
    items: z.array(z.lazy(() => BaseSearchItemSchema)),
});

export type ProviderSearchResponse = z.infer<
    typeof ProviderSearchResponseSchema
>;
