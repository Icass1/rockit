import { BACKEND_URL, BaseHttp, IApiFetchOptions } from "@/shared/index";
import { saveSessionCookie } from "@/lib/api";

export class Http extends BaseHttp {
    protected static override async baseApiFetchAsync(
        path: string,
        options: IApiFetchOptions = {}
    ): Promise<Response> {
        console.log(path, BACKEND_URL);

        const { method = "GET", headers, body, signal } = options;

        const SESSION_KEY = "session_id";

        const cookie = "";
        // const cookie = await getItemAsync(SESSION_KEY);

        const requestHeaders: Record<string, string> = {
            "Content-Type": "application/json",
            ...(typeof headers === "object" && !Array.isArray(headers)
                ? (headers as Record<string, string>)
                : {}),
            ...(cookie ? { Cookie: `session_id=${cookie}` } : {}),
        };

        const response = await fetch(`${BACKEND_URL}${path}`, {
            method,
            headers: requestHeaders,
            body,
            credentials: "include",
            signal,
        });

        await saveSessionCookie(response);

        return response;
    }
}
