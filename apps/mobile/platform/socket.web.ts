/** Browsers attach the authenticated cookie themselves; custom Cookie headers are forbidden. */
export async function createSocket(url: string): Promise<WebSocket> {
    return new WebSocket(url);
}
