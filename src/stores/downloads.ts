import { DownloadDB } from "@/lib/db/download";
import { atom } from "nanostores";

export const downloads = atom<string[]>([]);
export const downloadedLists = atom<string[]>([]);

let eventSources: string[] = [];

export const downloadInfo = atom<{
    [key: string]: { completed: number; message: string; downloadId: string };
}>({});

function onMessage(event: MessageEvent<string>, downloadId: string) {
    const message: { id: string; completed: number; message: string } =
        JSON.parse(event.data);

    downloadInfo.get()[message.id] = {
        message: message.message,
        completed: message.completed,
        downloadId,
    };

    downloadInfo.set({ ...downloadInfo.get() });
}

export async function startDownload(url: string) {
    console.warn("Only for development");
    const response = await fetch(`/api/downloads/start?url=${url}`);

    const downloadId = await response.json();

    // const downloadId = "A";

    downloads.set([...downloads.get(), downloadId]);
}

downloads.subscribe((value) => {
    for (const downloadId of value) {
        if (eventSources.includes(downloadId)) {
            continue;
        }
        eventSources.push(downloadId);
        const eventSource = new EventSource(
            `/api/downloads/status?id=${downloadId}`
        );
        eventSource.onmessage = (event) => {
            onMessage(event, downloadId);
        };
        eventSource.onerror = (error) => {
            eventSources = eventSources.filter((id) => id != downloadId);
            downloads.set(downloads.get().filter((id) => id != downloadId));
            console.log(eventSource.readyState, eventSource.CLOSED);
            console.error("EventSource failed:", error);
            eventSource.close();
        };
    }
});
if (typeof window != "undefined") {
    fetch("/api/downloads")
        .then((response) => response.json())
        .then((data: DownloadDB[]) => {
            data.forEach((download) =>
                downloads.set([...downloads.get(), download.id])
            );

            console.log(data);
        });
}
