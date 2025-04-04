import type {
    SpotifyAlbum,
    SpotifyAlbumImage,
    SpotifyArtist,
} from "@/types/spotify";
import { atom } from "nanostores";

interface EventSourceStatus {
    message: string;
    completed: number;
    song: {
        name: string;
        artists: SpotifyArtist[];
        album: SpotifyAlbum;
        id: string;
    };
    index?: number;
}

type ListInfo = {
    id: string;
    artists: SpotifyArtist[];
    images: SpotifyAlbumImage[];
    name: string;
    type: "playlist" | "album";
};

type StatusType = {
    songs: { [key: string]: EventSourceStatus };
    lists: {
        [key: string]: {
            listInfo: ListInfo;
            totalCompleted: number;
            listError: number;
            songs: { [key: string]: EventSourceStatus };
        };
    };
};

export const downloads = atom<string[]>([]);

// Songs that have been added to server database during this season
export const downloadedSongs = atom<string[]>([]);
export const downloadedLists = atom<string[]>([]);

export const status = atom<StatusType>({ songs: {}, lists: {} });

fetch("/api/downloads")
    .then((response) => response.json().then((data) => downloads.set(data)))
    .catch(() => downloads.set([]));

const songs: {
    [key: string]: {
        name: string;
        artists: SpotifyArtist[];
        album: SpotifyAlbum;
        id: string;
    };
} = {};
const lists: { [key: string]: ListInfo } = {};

let eventSources: string[] = [];

const onMessage = (event: MessageEvent<string>, eventSource: EventSource) => {
    const message = JSON.parse(event.data);
    // console.log("EventSource message:", message);

    if (message.song && !songs[message.song.id]) {
        songs[message.song.id] = message.song;
    }
    if (message.list) {
        lists[message.list.id] = message.list;
    }
    if (message.list_id == undefined) {
        const newValue = { ...status.get() };
        if (message.id == undefined) {
            console.warn("message.id is undefined");
        } else {
            newValue.songs[message.id] = {
                completed: message.completed,
                message: message.message,
                song: songs[message.id],
            };
        }

        // console.warn("newValue", newValue);
        status.set(newValue);
        if (message.completed == 100) {
            downloadedSongs.set([...downloadedSongs.get(), message.id]);
            eventSource.close();
        }
    } else {
        const newValue = { ...status.get() };
        if (newValue.lists[message.list_id] == undefined) {
            newValue.lists[message.list_id] = {
                listInfo: lists[message.list_id],
                totalCompleted: message.list_completed,
                songs: {},
                listError: message.list_error,
            };
        } else {
            newValue.lists[message.list_id].listInfo = lists[message.list_id];
            newValue.lists[message.list_id].totalCompleted =
                message.list_completed;
            newValue.lists[message.list_id].listError = message.list_error;
        }

        newValue.lists[message.list_id].songs[message.id] = {
            completed: message.completed,
            message: message.message,
            song: songs[message.id],
        };
        if (message.completed == 100) {
            downloadedSongs.set([...downloadedSongs.get(), message.id]);
        }

        // console.warn("newValue", newValue);
        status.set(newValue);
        if (
            Math.round((message.list_completed + message.list_error) * 100) /
                100 ==
            100
        ) {
            downloadedLists.set([...downloadedLists.get(), message.list_id]);
            eventSource.close();
        }
    }
};

downloads.subscribe((value) => {
    for (const downloadId of value) {
        if (eventSources.includes(downloadId)) {
            console.log("Skipping id", downloadId);
            continue;
        }
        eventSources?.push(downloadId);
        const eventSource = new EventSource(
            `/api/download-status/${downloadId}`
        );
        eventSource.onmessage = (event) => {
            onMessage(event, eventSource);
        };
        eventSource.onerror = (error) => {
            eventSources = eventSources.filter((id) => id != downloadId);
            console.error("EventSource failed:", error);
            eventSource.close();
        };
    }
});
