export async function confirmAction(
    _title: string,
    message: string,
    _accept: string,
    _cancel: string
): Promise<boolean> {
    return window.confirm(message);
}
