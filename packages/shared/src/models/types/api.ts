export interface IApiFetchOptions {
    method?: string;
    headers?: HeadersInit;
    body?: BodyInit | null;
    auth?: boolean;
    signal?: AbortSignal;
}

export type TZodSchema<T> = {
    parse: (data: unknown) => T;
};
