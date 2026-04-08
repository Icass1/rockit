import {
    LoginRequestSchema,
    LoginResponseSchema,
    RegisterRequestSchema,
    RegisterResponseSchema,
} from "@/dto";
import { getUserInClient } from "@/lib/getUserInClient";
import { rockIt } from "@/lib/rockit/rockIt";
import { apiPostFetch } from "@/lib/utils/apiFetch";

export interface AuthResult {
    success: boolean;
    error?: string;
}

export class AuthManager {
    async isLoggedInAsync(): Promise<boolean> {
        const res = await fetch(`${rockIt.BACKEND_URL}/user/session`, {
            credentials: "include",
        });
        return res.ok;
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
