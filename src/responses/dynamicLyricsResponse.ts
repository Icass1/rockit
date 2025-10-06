import * as z from "zod";
import { DynamicLyricsItem } from "@/types/rockIt";

export const DynamicLyricsResponse = z.array(DynamicLyricsItem);
