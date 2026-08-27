import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";
import { clearSessionOffline } from "@/lib/offline/db";

export interface AuthResult {
    success: boolean;
    error?: string;
}

export class AuthManager {
    async isLoggedInAsync(): Promise<boolean> {
        const res = await Http.getSession();
        return res.isOk();
    }

    async loginAsync(
        username: string,
        password: string,
        rememberMe: boolean = false
    ): Promise<AuthResult> {
        const res = await Http.login({
            username,
            password,
            platform: "WEB",
            rememberMe,
        });

        if (res.isOk()) {
            // Defensive: if a previous account never signed out, stale
            // user-scoped SW caches must not leak into the new session.
            await clearSessionOffline().catch(() => {});
            rockIt.init();
            return { success: true };
        } else if (res.isNotOk()) {
            return { success: false, error: res.detail.toString() };
        } else {
            return { success: false, error: "Unkown error." };
        }
    }

    async registerAsync(
        username: string,
        password: string,
        repeatPassword: string,
        rememberMe: boolean = false
    ): Promise<AuthResult> {
        const res = await Http.register({
            username,
            password,
            repeatPassword,
            platform: "WEB",
            rememberMe,
        });

        if (res.isOk()) {
            // Defensive: if a previous account never signed out, stale
            // user-scoped SW caches must not leak into the new session.
            await clearSessionOffline().catch(() => {});
            rockIt.init();
            return { success: true };
        } else if (res.isNotOk()) {
            return { success: false, error: res.detail.toString() };
        } else {
            return { success: false, error: "Unkown error." };
        }
    }
}
