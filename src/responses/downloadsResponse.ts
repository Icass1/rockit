import { DownloadItem } from "@/types/rockIt";
import * as z from "zod";

export const DownloadsResponse = z.array(DownloadItem);

export type DownloadsResponse = z.infer<typeof DownloadsResponse>;
