// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";
import { SearchProviderInfoSchema } from "./searchProviderInfo";

export const SearchProvidersResponseSchema = z.object({
    providers: z.array(z.lazy(() => SearchProviderInfoSchema)),
});

export type SearchProvidersResponse = z.infer<
    typeof SearchProvidersResponseSchema
>;
