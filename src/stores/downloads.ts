import { atom } from "nanostores";

export const downloads = atom<string[]>([]);
export const downloadedLists = atom<string[]>([]);

let eventSources: string[] = [];

export const downloadInfo = atom<{
    [key: string]: { completed: number; message: string };
}>({});

function onMessage(event: MessageEvent<string>, eventSource: EventSource) {
    const message: { id: string; completed: number; message: string } =
        JSON.parse(event.data);

    downloadInfo.get()[message.id] = {
        message: message.message,
        completed: message.completed,
    };

    downloadInfo.set({ ...downloadInfo.get() });
}

export async function startDownload(url: string) {
    const response = await fetch(`/api/downloads/start?url=${url}`);

    const downloadId = await response.json();

    downloads.set([...downloads.get(), downloadId]);
}

downloads.subscribe((value) => {
    for (const downloadId of value) {
        if (eventSources.includes(downloadId)) {
            console.log("Skipping id", downloadId);
            continue;
        }
        eventSources?.push(downloadId);
        const eventSource = new EventSource(
            `/api/downloads/status?id=${downloadId}`
        );
        eventSource.onmessage = (event) => {
            onMessage(event, eventSource);
        };
        eventSource.onerror = (error) => {
            eventSources = eventSources.filter((id) => id != downloadId);
            downloads.set(downloads.get().filter((id) => id != downloadId));
            console.error("EventSource failed:", error);
            eventSource.close();
        };
    }
});
