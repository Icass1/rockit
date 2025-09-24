import { Lang } from "@/types/lang";
import { atom } from "nanostores";

class AudioManager {
    private _audio?: HTMLAudioElement;
    constructor() {
        if (typeof window === "undefined") return;

        this._audio = new Audio();
    }
}

class LanguageManager {
    private _languages: string[] = ["en", "es", "fr", "de"];
    private _langAtom = atom<string | undefined>();
    private _langDataAtom = atom<Lang | undefined>();

    constructor() {
        this.init();
    }

    private async init() {
        const response = await fetch("/api/lang?lang=en");
        const data = await response.json();
        this._langDataAtom.set(data.langFile);
        this._langAtom.set(data.lang);
    }

    get langDataAtom() {
        return this._langDataAtom;
    }

    get langAtom() {
        return this._langAtom;
    }
}

class SongManager {}

class PlaylistManager {}

class AlbumManager {}

class ServiceWorkerManager {}

class NotificationManager {}

class QueueManager {}

class WebSocketManager {}

class DownloaderManager {}

export class RockIt {
    audioManager: AudioManager = new AudioManager();
    languageManager: LanguageManager = new LanguageManager();
    songManager: SongManager = new SongManager();
    playlistManager: PlaylistManager = new PlaylistManager();
    albumManager: AlbumManager = new AlbumManager();
    serviceWorkerManager: ServiceWorkerManager = new ServiceWorkerManager();
    notificationManager: NotificationManager = new NotificationManager();
    queueManager: QueueManager = new QueueManager();
    webSocketManager: WebSocketManager = new WebSocketManager();
    downloaderManager: DownloaderManager = new DownloaderManager();
    constructor() {
        console.log("RockIt initialized");
    }
}

export const rockitIt = new RockIt();
