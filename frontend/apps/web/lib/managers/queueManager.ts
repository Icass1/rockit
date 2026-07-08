import { BaseQueueManager } from "@rockit/shared";

/**
 * Web queue manager. All logic lives in the shared BaseQueueManager; the
 * default album fetch (via the HTTP client) already matches web behavior, so
 * this is a thin platform subclass.
 */
export class QueueManager extends BaseQueueManager {}
