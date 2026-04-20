import { useEffect, useState } from "react";
import { API_ENDPOINTS, SessionResponseSchema } from "@rockit/shared";
import { apiFetch } from "@/lib/api";
import { toasterManager } from "@/lib/toasterManager";
import { useVocabulary } from "@/lib/vocabulary";

interface SettingsUser {
    username: string;
    image: string;
    admin: boolean;
    isLoading: boolean;
}

export function useSettingsUser(): SettingsUser {
    const [user, setUser] = useState<SettingsUser>({
        username: "",
        image: "",
        admin: false,
        isLoading: true,
    });

    const { vocabulary } = useVocabulary();

    useEffect(() => {
        let cancelled = false;
        apiFetch(API_ENDPOINTS.userSession, SessionResponseSchema)
            .then((response) => {
                if (!response.isOk()) {
                    toasterManager.notifyError(vocabulary.ERROR_GETTING_USER);
                }
                if (!cancelled && response.isOk()) {
                    setUser({
                        username: response.result.username,
                        image: response.result.image,
                        admin: response.result.admin,
                        isLoading: false,
                    });
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setUser((prev) => ({ ...prev, isLoading: false }));
                }
            });

        return () => {
            cancelled = true;
        };
    }, [vocabulary.ERROR_GETTING_USER]);

    return user;
}
