export interface IUseFetch<T> {
    data: T | undefined;
    update: () => void;
    error: string | undefined;
    loading: boolean;
}
