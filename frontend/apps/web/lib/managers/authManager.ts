import {
    LoginRequestSchema,
    LoginResponseSchema,
    RegisterRequestSchema,
    RegisterResponseSchema,
    SessionResponseSchema,
} from "@/dto";
import { getUserInClient } from "@/lib/getUserInClient";
import { rockIt } from "@/lib/rockit/rockIt";
import { apiFetch, apiPostFetch } from "@/lib/utils/apiFetch";

export interface AuthResult {
    success: boolean;
    error?: string;
}

export class AuthManager {
    async isLoggedInAsync(): Promise<boolean> {
        const res = await apiFetch("/user/session", SessionResponseSchema);
        return res.isOk();
    }

    async loginAsync(username: string, password: string): Promise<AuthResult> {
        const res = await apiPostFetch(
            "/auth/login",
            LoginRequestSchema,
            LoginResponseSchema,
            {
                username,
                password,
                platform: "WEB",
            }
        );

        if (res.isOk()) {
            const session = await getUserInClient();
            rockIt.userManager.userAtomForDirectAccess.set(session);
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
        repeatPassword: string
    ): Promise<AuthResult> {
        const res = await apiPostFetch(
            "/auth/register",
            RegisterRequestSchema,
            RegisterResponseSchema,
            {
                username,
                password,
                repeatPassword,
                platform: "WEB",
            }
        );

        if (res.isOk()) {
            const session = await getUserInClient();
            rockIt.userManager.userAtomForDirectAccess.set(session);
            return { success: true };
        } else if (res.isNotOk()) {
            return { success: false, error: res.detail.toString() };
        } else {
            return { success: false, error: "Unkown error." };
        }
    }
}
