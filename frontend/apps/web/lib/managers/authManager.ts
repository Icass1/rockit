import { getUserInClient } from "@/lib/getUserInClient";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";

export interface AuthResult {
    success: boolean;
    error?: string;
}

export class AuthManager {
    async isLoggedInAsync(): Promise<boolean> {
        const res = await Http.getSession();
        return res.isOk();
    }

    async loginAsync(username: string, password: string): Promise<AuthResult> {
        const res = await Http.login({
            username,
            password,
            platform: "WEB",
        });

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
        const res = await Http.register({
            username,
            password,
            repeatPassword,
            platform: "WEB",
        });

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
