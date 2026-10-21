import { BaseQueueManager } from "@rockit/shared";

/**
 * Mobile queue manager. All logic lives in the shared BaseQueueManager; the
 * default album fetch (via the HTTP client) matches mobile behavior.
 */
export class QueueManager extends BaseQueueManager {}
