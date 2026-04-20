export interface FastApiError {
    detail: string | Record<string, unknown> | Array<unknown>;
}

export interface HttpSuccess<T> {
    ok: true;
    code: number;
    message: string;
    result: T;
}

export interface HttpFailure {
    ok: false;
    code: number;
    message: string;
    detail: FastApiError["detail"];
}

export type HttpResultType<T> = HttpSuccess<T> | HttpFailure;

export class HttpResult<T> {
    public readonly code: number;
    public readonly message: string;
    public readonly result?: T;
    public readonly detail?: FastApiError["detail"];

    constructor(data: HttpResultType<T>) {
        this.code = data.code;
        this.message = data.message;

        if (data.ok) {
            this.result = data.result;
        } else {
            this.detail = data.detail;
        }
    }

    isOk(): this is HttpResult<T> & { result: T } {
        return this.code >= 200 && this.code < 300;
    }

    isNotOk(): this is HttpResult<T> & { detail: FastApiError["detail"] } {
        return !this.isOk();
    }
}
