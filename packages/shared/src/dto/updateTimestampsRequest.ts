// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";
import { UpdateTimestampItemSchema } from "./updateTimestampItem";

export const UpdateTimestampsRequestSchema = z.object({
    timestamps: z.array(z.lazy(() => UpdateTimestampItemSchema)),
});

export type UpdateTimestampsRequest = z.infer<
    typeof UpdateTimestampsRequestSchema
>;
