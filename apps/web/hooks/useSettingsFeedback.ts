"use client";

import { useRuntimeServices } from "@/components/providers/RuntimeProvider";
import {
    useLanguage,
    useVocabulary,
} from "@/components/providers/VocabularyProvider";

export function useSettingsFeedback(): (saved?: boolean) => void {
    const { notificationManager } = useRuntimeServices();
    const vocabulary = useVocabulary();
    const lang = useLanguage();
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
        if (saved) notificationManager.notifySuccess(message);
        else notificationManager.notifyWarn(message);
    };
}
