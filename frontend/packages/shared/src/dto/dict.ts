import { z } from "zod";

export const DictSchema = z.record(z.string(), z.any());

export type Dict = z.infer<typeof DictSchema>;
