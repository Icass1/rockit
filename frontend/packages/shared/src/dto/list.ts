// This file is generated using: python3 -m backend zod
// Do not modify this file manually.

import { z } from "zod";

export const ListSchema = z.array(z.any());

export type List = z.infer<typeof ListSchema>;
