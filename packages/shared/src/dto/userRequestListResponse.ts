// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";
import { UserRequestResponseSchema } from "./userRequestResponse";

export const UserRequestListResponseSchema = z.object({
    requests: z.array(z.lazy(() => UserRequestResponseSchema)),
});

export type UserRequestListResponse = z.infer<
    typeof UserRequestListResponseSchema
>;
