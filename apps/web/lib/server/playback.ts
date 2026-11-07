import "server-only";
import { cache } from "react";
import type { QueueResponse } from "@/dto";
import { ServerHttp } from "@/lib/api/server";
import { requireResult } from "@/lib/server/resources";

export const getInitialQueue = cache(async (): Promise<QueueResponse> =>
    requireResult(await ServerHttp.getQueue(undefined, 50))
);
