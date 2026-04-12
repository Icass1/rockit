// This file is generated using: python3 -m backend zod
// Do not modify this file manually.

import { z } from "zod";

export const SequenceSchema = z.array(z.any());

export type Sequence = z.infer<typeof SequenceSchema>;
