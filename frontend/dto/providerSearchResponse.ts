import { BaseSearchItemSchema } from "@/dto/baseSearchItem";
import { z } from "zod";

export const ProviderSearchResponseSchema = z.object({
    provider: z.string(),
    items: z.array(z.lazy(() => BaseSearchItemSchema)),
});

export type ProviderSearchResponse = z.infer<
    typeof ProviderSearchResponseSchema
>;
