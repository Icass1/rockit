"use client";

import { useState, useSyncExternalStore, type JSX } from "react";
import { useStore } from "@nanostores/react";
import { useSettingsFeedback } from "@/hooks/useSettingsFeedback";
import { rockIt } from "@/lib/rockit/rockIt";

function subscribePlatform(): () => void {
    return (): void => undefined;
}

export default function CrossFadeInput(): JSX.Element {
    const notifySaved = useSettingsFeedback();
    const settings = useStore(rockIt.mediaPlayerManager.transitionSettingsAtom);
    const vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const lang = useStore(rockIt.vocabularyManager.langAtom);
    const es = lang.startsWith("es");
    const supported = useSyncExternalStore(
        subscribePlatform,
        () => rockIt.mediaPlayerManager.supportsAdaptiveTransitions,
        () => true
    );
    const [duration, setDuration] = useState<string | null>(null);
    const saveDuration = (): void => {
        if (duration === null) return;
        const seconds = Number(duration);
        if (
            duration.trim() !== "" &&
            Number.isFinite(seconds) &&
            seconds >= 0.1 &&
            seconds !== settings.maxSeconds
        ) {
            notifySaved(
                rockIt.mediaPlayerManager.configureTransitions({
                    maxSeconds: seconds,
                })
            );
        }
        setDuration(null);
    };
    const text = (key: string, english: string, spanish: string): string => {
        const translated = (vocabulary as unknown as Record<string, string>)[
            key
        ];
        return translated && translated !== key
            ? translated
            : es
              ? spanish
              : english;
    };

    return (
        <div className="flex flex-col gap-4 text-sm text-neutral-400">
            <label
                htmlFor="adaptive-transitions"
                className="flex items-center justify-between gap-3"
            >
                <span>
                    {text(
                        "SETTINGS_ADAPTIVE_TRANSITIONS",
                        "Song transitions (experimental)",
                        "Transiciones entre canciones (experimental)"
                    )}
                </span>
                <input
                    id="adaptive-transitions"
                    type="checkbox"
                    checked={supported && settings.enabled}
                    disabled={!supported}
                    aria-describedby={
                        !supported ? "transition-platform-note" : undefined
                    }
                    onChange={(event): void =>
                        notifySaved(
                            rockIt.mediaPlayerManager.configureTransitions({
                                enabled: event.currentTarget.checked,
                            })
                        )
                    }
                    className="h-4 w-4 accent-(--color-rockit-pink)"
                />
            </label>
            {!supported && (
                <p
                    id="transition-platform-note"
                    className="text-xs text-neutral-400"
                >
                    {vocabulary.SETTINGS_TRANSITIONS_IOS_NATIVE}
                </p>
            )}
            <div className="flex items-center justify-between gap-3">
                <label htmlFor="transition-duration">
                    {text(
                        "SETTINGS_TRANSITION_DURATION",
                        "Transition duration",
                        "Duración de la transición"
                    )}
                </label>
                <div className="flex items-center gap-2">
                    <input
                        id="transition-duration"
                        type="number"
                        min={0.1}
                        step={0.1}
                        value={duration ?? settings.maxSeconds}
                        disabled={!supported || !settings.enabled}
                        onChange={(event): void =>
                            setDuration(event.currentTarget.value)
                        }
                        onBlur={saveDuration}
                        onKeyDown={(event): void => {
                            if (event.key === "Enter")
                                event.currentTarget.blur();
                            if (event.key === "Escape") setDuration(null);
                        }}
                        aria-describedby="transition-duration-unit"
                        className="w-24 rounded-xl border border-neutral-700 bg-neutral-800 px-3 py-2 text-white disabled:opacity-50"
                    />
                    <span id="transition-duration-unit">s</span>
                </div>
            </div>
            <label
                htmlFor="transition-preserve-album"
                className="flex items-center justify-between gap-3"
            >
                <span>
                    {text(
                        "SETTINGS_TRANSITION_PRESERVE_ALBUM",
                        "Keep endings within the same album",
                        "Conservar finales dentro del mismo álbum"
                    )}
                </span>
                <input
                    id="transition-preserve-album"
                    type="checkbox"
                    checked={settings.preserveAlbum}
                    disabled={!supported || !settings.enabled}
                    onChange={(event): void =>
                        notifySaved(
                            rockIt.mediaPlayerManager.configureTransitions({
                                preserveAlbum: event.currentTarget.checked,
                            })
                        )
                    }
                    className="h-4 w-4 accent-(--color-rockit-pink)"
                />
            </label>
            <p className="text-xs text-neutral-500">
                {text(
                    "SETTINGS_TRANSITION_DURATION_HELP",
                    "Choose any duration from 0.1 seconds, for example 5 or 6. Overlap is limited to half of either track. Audio songs only; silence is not skipped. Changes are saved on this device.",
                    "Elige una duración desde 0,1 segundos, por ejemplo 5 o 6. El cruce se limita a la mitad de cada canción. Solo audio; no se saltan silencios. Los cambios se guardan en este dispositivo."
                )}
            </p>
        </div>
    );
}
