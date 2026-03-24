import { useEffect, useState } from "react";
import {
    API_ENDPOINTS,
    SessionResponse,
    SessionResponseSchema,
} from "@rockit/shared";
import { apiFetch } from "@/lib/api";

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
        apiFetch(API_ENDPOINTS.userSession)
            .then((res) => {
                if (!res.ok) return null;
                return res.json();
            })
            .then((data) => {
                if (!cancelled && data) {
                    try {
                        const parsed = SessionResponseSchema.parse(
                            data
                        ) as SessionResponse;
                        setUser({
                            username: parsed.username ?? "",
                            image: parsed.image ?? "",
                            admin: parsed.admin ?? false,
                            isLoading: false,
                        });
                    } catch {
                        setUser((prev) => ({ ...prev, isLoading: false }));
                    }
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
