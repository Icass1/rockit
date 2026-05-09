import { useEffect, useState } from "react";
import { Http, HttpResult, type SessionResponse } from "@rockit/shared";
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
        Http.getSession()
            .then((response: HttpResult<SessionResponse>) => {
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
