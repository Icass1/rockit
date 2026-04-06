import { z } from "zod";

export const ListSchema = z.array(z.any());

export type List = z.infer<typeof ListSchema>;
