import { BACKEND_URL } from "@/environment";
import { IApiFetchOptions, TZodSchema } from "@/models/types/api";

// --------------------
// HttpResult Types
// --------------------

/** FastAPI error format */
export interface FastApiError {
    detail: string | Record<string, unknown> | Array<unknown>;
}

/** Success result */
export interface HttpSuccess<T> {
    ok: true;
    code: number;
    message: string;
    result: T;
}

/** Error result */
export interface HttpFailure {
    ok: false;
    code: number;
    message: string;
    detail: FastApiError["detail"];
}

/** Discriminated union */
export type HttpResultType<T> = HttpSuccess<T> | HttpFailure;

// --------------------
// HttpResult Class
// --------------------

export class HttpResult<T> {
    public readonly code: number;
    public readonly message: string;
    public readonly result?: T;
    public readonly detail?: FastApiError["detail"];

    constructor(success: HttpSuccess<T>);
    constructor(failure: HttpFailure);
    constructor(data: HttpResultType<T>) {
        this.code = data.code;
        this.message = data.message;

        if (data.ok) {
            this.result = data.result;
        } else {
            this.detail = data.detail;
        }
    }

    /** Narrow to success — use a method, not a getter, for type predicates */
    isOk(): this is HttpResult<T> & { result: T } {
        return this.code >= 200 && this.code < 300;
    }

    /** Narrow to failure */
    isNotOk(): this is HttpResult<T> & { detail: FastApiError["detail"] } {
        return !this.isOk();
    }
}

// --------------------
// baseApiFetch
// --------------------

async function baseApiFetch(path: string, options: IApiFetchOptions = {}) {
    const { method = "GET", headers, body, signal } = options;

    if (!path.startsWith("/")) {
        console.warn(`'${path}' doesn't start with /`);
    }

    // Server side (Next.js)
    if (typeof window === "undefined") {
        const { cookies } = await import("next/headers");
        const cookieStore = await cookies();
        const session = cookieStore.get("session_id")?.value;

        const existingHeaders =
            typeof headers === "object" && !Array.isArray(headers)
                ? (headers as Record<string, string>)
                : {};

        const requestHeaders: Record<string, string> = {
            ...existingHeaders,
            ...(session ? { Cookie: `session_id=${session}` } : {}),
        };

        return fetch(`${BACKEND_URL}${path}`, {
            method,
            headers: requestHeaders,
            body,
            cache: "no-store",
        });
    }

    // Client side
    return fetch(`${BACKEND_URL}${path}`, {
        method,
        headers,
        body,
        credentials: "include",
        signal,
    });
}

// --------------------
// apiFetch
// --------------------

export async function apiFetch<T>(
    path: string,
    schema: TZodSchema<T>,
    options: IApiFetchOptions = {}
): Promise<HttpResult<T>> {
    let res: Response;

    try {
        res = await baseApiFetch(path, options);
    } catch (err) {
        return new HttpResult<T>({
            ok: false,
            code: 0,
            message: "Network Error",
            detail: (err as Error).message,
        });
    }

    let json: unknown;

    try {
        json = await res.json();
    } catch {
        return new HttpResult<T>({
            ok: false,
            code: res.status,
            message: res.statusText,
            detail: "Invalid JSON response from server",
        });
    }

    if (!res.ok) {
        const obj = json as { detail?: FastApiError["detail"] };

        return new HttpResult<T>({
            ok: false,
            code: res.status,
            message: res.statusText,
            detail: obj.detail ?? "Unknown error",
        });
    }

    try {
        const parsed = schema.parse(json);
        return new HttpResult<T>({
            ok: true,
            code: res.status,
            message: res.statusText,
            result: parsed,
        });
    } catch (err) {
        return new HttpResult<T>({
            ok: false,
            code: res.status,
            message: "Validation Error",
            detail: (err as Error).message,
        });
    }
}

// --------------------
// apiPostFetch
// --------------------

export async function apiPostFetch<T, G>(
    path: string,
    requestSchema: TZodSchema<T>,
    responseSchema: TZodSchema<G>,
    body: T
): Promise<HttpResult<G>> {
    return apiFetch(path, responseSchema, {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
    });
}
