import * as z from "zod";
import { RockItSongWithAlbumResponse } from "../rockItSongWithAlbumResponse";

export const StatsResponse = z.array(RockItSongWithAlbumResponse);
export type StatsResponseType = z.infer<typeof StatsResponse>;
