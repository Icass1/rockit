export function getLocalStartOfDay(dateStr: string): string {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d, 0, 0, 0, 0).toISOString();
}

export function getLocalEndOfDay(dateStr: string): string {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d, 23, 59, 59, 999).toISOString();
}
