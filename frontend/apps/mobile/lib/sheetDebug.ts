import { logger } from "@/lib/logger";

export const SHEET_DEBUG_PREFIX = "[SheetDebug]";

export function logSheetDebug(
    event: string,
    details: Record<string, unknown> = {}
) {
    const enabled = false;
    if (enabled)
        logger.debug(
            `${SHEET_DEBUG_PREFIX} ${event} ${JSON.stringify(details)}`
        );
}
