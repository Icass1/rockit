// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const SessionTokenClaimsSchema = z.object({
    iat: z.number(),
    exp: z.number(),
    sub: z.string(),
    jti: z.string(),
    platform: z.union([z.literal("WEB"), z.literal("MOBILE")]),
    ip: z.string().nullable(),
});

export type SessionTokenClaims = z.infer<typeof SessionTokenClaimsSchema>;
