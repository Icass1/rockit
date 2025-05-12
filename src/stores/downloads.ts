import { DownloadDB } from "@/lib/db/download";
import { atom } from "nanostores";

export const downloads = atom<string[]>([]);
export const downloadedLists = atom<string[]>([]);

let eventSources: string[] = [];

export const downloadInfo = atom<{
    [key: string]: {
        completed: number;
        message: string;
        downloadId: string;
        selected: boolean;
    };
}>({});

function onMessage(event: MessageEvent<string>, downloadId: string) {
    const message: { id: string; completed: number; message: string } =
        JSON.parse(event.data);

    downloadInfo.get()[message.id] = {
        message: message.message,
        completed: message.completed,
        downloadId,
        selected: true,
    };

    downloadInfo.set({ ...downloadInfo.get() });
}

export async function startDownload(url: string) {
    let downloadId;

    if (url == "") {
        console.warn("Only for development", url);
        downloadId = "mockup";
    } else {
        const response = await fetch(`/api/downloads/start?url=${url}`);

        downloadId = await response.json();
    }

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
            if (eventSource.readyState == eventSource.CLOSED) return;
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
        });
}
