import type { QueueResponse, SessionResponse } from "@/dto";
import type { QueueManager } from "@/lib/managers/queueManager";

export interface InitialPlayback {
    queue?: QueueResponse;
    session?: SessionResponse;
}

export interface QueueContextValue {
    initial: InitialPlayback;
    manager: QueueManager;
}
