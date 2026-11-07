// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";

export const UpdateVolumeRequestSchema = z.object({
    volume: z.number(),
});

export type UpdateVolumeRequest = z.infer<typeof UpdateVolumeRequestSchema>;
