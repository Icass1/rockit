import { AlbumManager } from "@/lib/managers/albumManager";
import { AudioManager } from "@/lib/managers/audioManager";
import { AuthManager } from "@/lib/managers/authManager";
import { CurrentListManager } from "@/lib/managers/currentListManager";
import { DownloaderManager } from "@/lib/managers/downloaderManager";
import { EventManager } from "@/lib/managers/eventManager";
import { IndexedDBManager } from "@/lib/managers/indexedDBManager";
import { ListManager } from "@/lib/managers/listManager";
import { MediaManager } from "@/lib/managers/mediaManager";
import { NotificationManager } from "@/lib/managers/notificationManager";
import { PlayerUIManager } from "@/lib/managers/playerUIManager";
import { PlaylistManager } from "@/lib/managers/playlistManager";
import { QueueManager } from "@/lib/managers/queueManager";
import { SearchManager } from "@/lib/managers/searchManager";
import { StationManager } from "@/lib/managers/stationManager";
import { UserManager } from "@/lib/managers/userManager";
import { VocabularyManager } from "@/lib/managers/vocabularyManager";
import { WebSocketManager } from "@/lib/managers/webSocketManger";

export class RockIt {
    public readonly VERSION = "0.1.0";
    public readonly BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "";
    public readonly PLAYLIST_PLACEHOLDER_IMAGE_URL =
        "/playlist-placeholder.png";
    public readonly ALBUM_PLACEHOLDER_IMAGE_URL =
        process.env.NEXT_PUBLIC_BACKEND_URL + "/image/album-placeholder.png";
    public readonly MEDIA_PLACEHOLDER_IMAGE_URL =
        process.env.NEXT_PUBLIC_BACKEND_URL + "/image/song-placeholder.png";
    public readonly SONG_PLACEHOLDER_IMAGE_URL =
        process.env.NEXT_PUBLIC_BACKEND_URL + "/image/song-placeholder.png";
    public readonly STATION_PLACEHOLDER_IMAGE_URL =
        process.env.NEXT_PUBLIC_BACKEND_URL + "/image/radio-placeholder.png";
    public readonly USER_PLACEHOLDER_IMAGE_URL =
        process.env.NEXT_PUBLIC_BACKEND_URL + "/image/user-placeholder.png";

    notificationManager = new NotificationManager();
    webSocketManager = new WebSocketManager();
    userManager = new UserManager();
    searchManager = new SearchManager();
    mediaManager = new MediaManager();
    listManager = new ListManager();
    currentListManager = new CurrentListManager();
    vocabularyManager = new VocabularyManager();
    stationManager = new StationManager();
    downloaderManager = new DownloaderManager();
    playlistManager = PlaylistManager;
    albumManager = AlbumManager;
    authManager = new AuthManager();
    audioManager = new AudioManager();
    queueManager = new QueueManager();
    playerUIManager = new PlayerUIManager();
    indexedDBManager = new IndexedDBManager();
    eventManager = new EventManager();

    constructor() {
        if (typeof window === "undefined") return;

        this.webSocketManager.init();
    }
}

export const rockIt = new RockIt();

if (typeof window !== "undefined") {
    rockIt.queueManager.init();
    rockIt.userManager.init();
    rockIt.listManager.initLibrary();
}
