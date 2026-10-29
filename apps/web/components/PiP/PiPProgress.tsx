"use client";

import { useRef, type JSX } from "react";
import { useStore } from "@nanostores/react";
import { usePiPText } from "@/hooks/usePiPText";
import { rockIt } from "@/lib/rockit/rockIt";
import { getTime } from "@/lib/utils/getTime";

export function PiPProgress(): JSX.Element {
    const text = usePiPText();
    const time = useStore(rockIt.mediaPlayerManager.currentTimeAtom);
    const rawDuration = useStore(rockIt.mediaPlayerManager.durationAtom);
    const duration = Number.isFinite(rawDuration)
        ? Math.max(0, rawDuration)
        : 0;
    const position = Number.isFinite(time)
        ? Math.max(0, Math.min(time ?? 0, duration))
        : 0;
    const seeking = useRef(false);
    const finishSeek = (value: number): void => {
        if (!seeking.current) return;
        seeking.current = false;
        rockIt.mediaPlayerManager.endSeek(value);
    };
    return (
        <div className="pip-progress-bar">
            <span className="pip-time-label">{getTime(position)}</span>
            <input
                type="range"
                className="pip-slider"
                aria-label={text(
                    "PIP_POSITION",
                    "Playback position",
                    "Posición de reproducción"
                )}
                value={position}
                min={0}
                max={duration || 1}
                step={0.1}
                disabled={duration <= 0}
                style={{
                    background: `linear-gradient(to right, var(--pip-accent) ${duration > 0 ? (position / duration) * 100 : 0}%, #ffffff30 0%)`,
                }}
                onChange={(event): void =>
                    rockIt.mediaPlayerManager.setCurrentTime(
                        Number(event.currentTarget.value),
                        !seeking.current
                    )
                }
                onPointerDown={(): void => {
                    if (duration > 0) {
                        seeking.current = true;
                        rockIt.mediaPlayerManager.beginSeek();
                    }
                }}
                onPointerUp={(event): void =>
                    finishSeek(Number(event.currentTarget.value))
                }
                onPointerCancel={(event): void =>
                    finishSeek(Number(event.currentTarget.value))
                }
                onBlur={(event): void =>
                    finishSeek(Number(event.currentTarget.value))
                }
            />
            <span className="pip-time-label">{getTime(duration)}</span>
        </div>
    );
}
