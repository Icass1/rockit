import { useCallback, useEffect, useRef } from "react";
import { downloadZip } from "@/platform/downloadZip";
import { useStore } from "@nanostores/react";
import { rockIt } from "@/lib/rockit/rockIt";
import { toasterManager } from "@/lib/toasterManager";
import { useVocabulary } from "@/lib/vocabulary";

/** One menu export per mounted trigger, cancelled when its session or screen changes. */
export function useExportDownload() {
    const session = useStore(rockIt.userManager.sessionAtom);
    const { vocabulary } = useVocabulary();
    const pending = useRef<AbortController | null>(null);
    useEffect(
        () => () => {
            pending.current?.abort();
            pending.current = null;
        },
        [session]
    );
    return useCallback(
        async (ids: string[], title: string) => {
            if (!session || pending.current) return;
            const controller = new AbortController();
            pending.current = controller;
            const current = () =>
                pending.current === controller &&
                rockIt.userManager.sessionAtom.get() === session;
            try {
                await downloadZip(ids, title, controller.signal, current);
                if (current() && !controller.signal.aborted)
                    toasterManager.notifySuccess(
                        vocabulary.NOTIFICATIONS_ZIP_READY
                    );
            } catch {
                if (current() && !controller.signal.aborted)
                    toasterManager.notifyError(
                        vocabulary.ERROR_STARTING_DOWNLOAD
                    );
            } finally {
                if (pending.current === controller) pending.current = null;
            }
        },
        [session, vocabulary]
    );
}
