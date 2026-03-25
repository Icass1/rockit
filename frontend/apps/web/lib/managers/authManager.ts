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
            const text = await res.text();

            if (!res.ok) {
                let message = "Login failed";
                try {
                    const data = JSON.parse(text);
                    message = data.detail || data.error || message;
                } catch {
                    message = text || message;
                }
                return { success: false, error: message };
            }

            LoginResponseSchema.parse(JSON.parse(text));

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
            const text = await res.text();

            if (!res.ok) {
                let message = "Register failed";
                try {
                    const data = JSON.parse(text);
                    message = data.detail || data.error || message;
                } catch {
                    message = text || message;
                }
                return { success: false, error: message };
            }

            RegisterResponseSchema.parse(JSON.parse(text));

            const session = await getUserInClient();
            rockIt.userManager.userAtom.set(session);

            return { success: true };
        } catch (err) {
            console.error(err);
            return { success: false, error: "Network error" };
        }
    }
}
