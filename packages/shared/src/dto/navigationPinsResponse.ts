// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";
import { NavigationPinResponseSchema } from "./navigationPinResponse";

export const NavigationPinsResponseSchema = z.object({
    pins: z.array(z.lazy(() => NavigationPinResponseSchema)),
});

export type NavigationPinsResponse = z.infer<
    typeof NavigationPinsResponseSchema
>;
