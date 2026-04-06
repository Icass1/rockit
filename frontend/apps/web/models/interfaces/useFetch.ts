export interface IUseFetch<T> {
    data: T | undefined;
    update: () => void;
    error: boolean | undefined;
    loading: boolean;
}
