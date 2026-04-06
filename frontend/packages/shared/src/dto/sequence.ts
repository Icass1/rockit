import { z } from "zod";

export const SequenceSchema = z.array(z.any());

export type Sequence = z.infer<typeof SequenceSchema>;
