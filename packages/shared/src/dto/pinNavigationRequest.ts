// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";

export const PinNavigationRequestSchema = z.object({
    publicId: z.string(),
});

export type PinNavigationRequest = z.infer<typeof PinNavigationRequestSchema>;
