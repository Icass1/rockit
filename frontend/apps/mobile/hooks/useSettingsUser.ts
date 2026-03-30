import { useEffect, useState } from "react";
import { API_ENDPOINTS, SessionResponseSchema } from "@rockit/shared";
import { apiGet } from "@/lib/api";

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

    useEffect(() => {
        let cancelled = false;
        apiGet(API_ENDPOINTS.userSession, SessionResponseSchema)
            .then((parsed) => {
                if (!cancelled) {
                    setUser({
                        username: parsed.username ?? "",
                        image: parsed.image ?? "",
                        admin: parsed.admin ?? false,
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
    }, []);

    return user;
}
