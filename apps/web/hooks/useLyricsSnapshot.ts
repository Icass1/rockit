"use client";

import { useEffect, useState } from "react";
import type {
    LyricsSnapshot,
    LyricsSnapshotState,
} from "@/models/interfaces/lyricsSnapshot";
import { Http } from "@/lib/http";

export function useLyricsSnapshot(
    publicId?: string,
    enabled = true
): LyricsSnapshotState {
    const [state, setState] = useState<{
        id?: string;
        data?: LyricsSnapshot;
        failed?: boolean;
    }>();
    const [reload, setReload] = useState(0);
    useEffect(() => {
        const refresh = (): void => setReload((value) => value + 1);
        window.addEventListener("lyrics-updated", refresh);
        return (): void =>
            window.removeEventListener("lyrics-updated", refresh);
    }, []);
    useEffect(() => {
        if (!enabled || !publicId) return;
        let cancelled = false;
        const load = async (): Promise<void> => {
            try {
                const response =
                    await Http.getLyricsCorrectionContextAsync(publicId);
                let data: LyricsSnapshot | undefined;
                if (response.isOk()) {
                    const current = response.result;
                    const timed =
                        current.lines.length > 0 &&
                        current.lines.every(
                            (line) => line.timestamp_s !== null
                        );
                    data = {
                        ...current,
                        dynamic: timed
                            ? {
                                  provider: current.provider,
                                  publicId: current.publicId,
                                  offset: current.offset,
                                  lines: current.lines
                                      .filter(
                                          (line) => line.timestamp_s !== null
                                      )
                                      .map((line) => ({
                                          text: line.text,
                                          timestamp_s:
                                              line.timestamp_s as number,
                                      })),
                              }
                            : undefined,
                    };
                }
                if (!cancelled) setState({ id: publicId, data, failed: !data });
            } catch {
                if (!cancelled) setState({ id: publicId, failed: true });
            }
        };
        void load();
        return (): void => {
            cancelled = true;
        };
    }, [publicId, enabled, reload]);
    const current = enabled && state?.id === publicId ? state : undefined;
    return {
        data: current?.data,
        loading: enabled && !!publicId && !current,
        failed: current?.failed === true,
    };
}
