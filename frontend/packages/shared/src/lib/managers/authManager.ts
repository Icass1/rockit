import { LoginRequestSchema, type LoginRequest } from "@/dto";
import { LoginResponseSchema } from "@/dto/loginResponse";
import {
    RegisterRequestSchema,
    type RegisterRequest,
} from "@/dto/registerRequest";
import { RegisterResponseSchema } from "@/dto/registerResponse";
import { getUserInClient } from "@/lib/getUserInClient";
import { rockIt } from "@/lib/rockit/rockIt";
import { apiPostFetch } from "@/lib/utils/apiFetch";

export interface AuthResult {
    success: boolean;
    error?: string;
}

export class AuthManager {
    async loginAsync(username: string, password: string): Promise<AuthResult> {
        try {
            const request: LoginRequest = { username, password };
            LoginRequestSchema.parse(request);

            const res = await apiPostFetch("/auth/login", request);

            if (!res.ok) {
                let message = "Login failed";
                try {
                    const data = await res.json();
                    message = data.detail || data.error || message;
                } catch {
                    message = await res.text();
                }
                return { success: false, error: message };
            }

            LoginResponseSchema.parse(await res.json());

            const session = await getUserInClient();
            rockIt.userManager.userAtom.set(session);

            return { success: true };
        } catch (err) {
            console.error(err);
            return { success: false, error: "Network error" };
        }
    }

    async registerAsync(
        username: string,
        password: string,
        repeatPassword: string
    ): Promise<AuthResult> {
        try {
            const request: RegisterRequest = {
                username,
                password,
                repeatPassword,
            };
            RegisterRequestSchema.parse(request);

            const res = await apiPostFetch("/auth/register", request);

            if (!res.ok) {
                const text = await res.text();
                return { success: false, error: text || "Register failed" };
            }

            RegisterResponseSchema.parse(await res.json());

            const session = await getUserInClient();
            rockIt.userManager.userAtom.set(session);

            return { success: true };
        } catch (err) {
            console.error(err);
            return { success: false, error: "Network error" };
        }
    }
}
