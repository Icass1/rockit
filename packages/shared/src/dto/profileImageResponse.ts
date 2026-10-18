// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const ProfileImageResponseSchema = z.object({
    publicId: z.string(),
    url: z.string(),
});

export type ProfileImageResponse = z.infer<typeof ProfileImageResponseSchema>;
