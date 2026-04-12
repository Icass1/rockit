// This file is generated using: python3 -m backend zod
// Do not modify this file manually.

import { z } from "zod";
import { BuildResponseSchema } from "./buildResponse";

export const AllBuildsResponseSchema = z.object({
    builds: z.array(z.lazy(() => BuildResponseSchema)),
});

export type AllBuildsResponse = z.infer<typeof AllBuildsResponseSchema>;
