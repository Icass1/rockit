// This file is generated using: python3 -m backend zod
// Do not modify this file manually.

import { z } from "zod";

export const DictSchema = z.record(z.string(), z.any());

export type Dict = z.infer<typeof DictSchema>;
