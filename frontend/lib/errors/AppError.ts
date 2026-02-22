export class AppError extends Error {
    constructor(public readonly status: number) {
        super(`AppError: ${status}`);
        this.name = "AppError";
    }
}