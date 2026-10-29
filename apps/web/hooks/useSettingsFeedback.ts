"use client";

import { useStore } from "@nanostores/react";
import { rockIt } from "@/lib/rockit/rockIt";

export function useSettingsFeedback(): (saved?: boolean) => void {
    const vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const lang = useStore(rockIt.vocabularyManager.langAtom);
    return (saved = true): void => {
        const key = saved ? "SETTINGS_SAVED" : "SETTINGS_NOT_PERSISTED";
        const translated = (vocabulary as unknown as Record<string, string>)[
            key
        ];
        const message =
            translated && translated !== key
                ? translated
                : lang.startsWith("es")
                  ? saved
                      ? "Ajustes guardados"
                      : "Ajustes aplicados en esta sesión, pero no se han podido guardar en este dispositivo"
                  : saved
                    ? "Settings saved"
                    : "Settings applied for this session, but could not be saved on this device";
        if (saved) rockIt.notificationManager.notifySuccess(message);
        else rockIt.notificationManager.notifyWarn(message);
    };
}
