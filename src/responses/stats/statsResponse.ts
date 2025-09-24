import { RockItSong } from "@/types/rockIt";
import * as z from "zod";

export const StatsResponse = z.array(RockItSong);
export type StatsResponseType = z.infer<typeof StatsResponse>;
