import * as z from "zod";
import { RockItSongWithAlbumResponse } from "./rockItSongWithAlbumResponse";

import { QueueListTypes } from "@/types/rockIt";

export const QueueResponse = z.object({
    currentQueueSongId: z.number().nullable(),
    queue: z.array(
        z.object({
            song: RockItSongWithAlbumResponse,
            queueSongId: z.number(),
            list: z.object({
                type: z.enum(QueueListTypes),
                publicId: z.string(),
            }),
        })
    ),
});

export type QueueResponse = z.infer<typeof QueueResponse>;
