import { RockItSongWithAlbum } from "@/types/rockIt";
import * as z from "zod";

export const StatsResponse = z.array(RockItSongWithAlbum);
export type StatsResponseType = z.infer<typeof StatsResponse>;
