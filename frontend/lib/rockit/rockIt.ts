import { AlbumManager } from "@/lib/managers/albumManager";
import { AudioManager } from "@/lib/managers/audioManager";
import { CurrentListManager } from "@/lib/managers/currentListManager";
import { DownloaderManager } from "@/lib/managers/downloaderManager";
import { IndexedDBManager } from "@/lib/managers/indexedDBManager";
import { ListManager } from "@/lib/managers/listManager";
import { NotificationManager } from "@/lib/managers/notificationManager";
import { PlayerUIManager } from "@/lib/managers/playerUIManager";
import { PlaylistManager } from "@/lib/managers/playlistManager";
import { QueueManager } from "@/lib/managers/queueManager";
import { SearchManager } from "@/lib/managers/searchManager";
import { ServiceWorkerManager } from "@/lib/managers/serviceWorkerManager";
import { SongManager } from "@/lib/managers/songManager";
import { StationManager } from "@/lib/managers/stationManager";
import { UserManager } from "@/lib/managers/userManager";
import { WebSocketManager } from "@/lib/managers/webSocketManger";

export const RESPONSE_UNDEFINED_MESSAGE = "Response is undefined.";

export class RockIt {
    // #region: Constants

    public readonly VERSION = "0.1.0";
    public readonly BACKEND_URL =
        process.env.NEXT_PUBLIC_BACKEND_URL || "undefined";
    public readonly PLAYLIST_PLACEHOLDER_IMAGE_URL = "/song-placeholder.png";
    public readonly ALBUM_PLACEHOLDER_IMAGE_URL = "/song-placeholder.png";
    public readonly SONG_PLACEHOLDER_IMAGE_URL = "/song-placeholder.png";
    public readonly STATION_PLACEHOLDER_IMAGE_URL = "/radio-placeholder.png";
    public readonly USER_PLACEHOLDER_IMAGE_URL = "/user-placeholder.png";
    // #endregion: Constants

    // #region: Managers

    audioManager: AudioManager = new AudioManager();
    songManager: SongManager = new SongManager();
    playlistManager: PlaylistManager = new PlaylistManager();
    albumManager: AlbumManager = new AlbumManager();
    serviceWorkerManager: ServiceWorkerManager = new ServiceWorkerManager();
    notificationManager: NotificationManager = new NotificationManager();
    queueManager: QueueManager = new QueueManager();
    webSocketManager: WebSocketManager = new WebSocketManager();
    downloaderManager: DownloaderManager = new DownloaderManager();
    userManager: UserManager = new UserManager();
    stationManager: StationManager = new StationManager();
    playerUIManager: PlayerUIManager = new PlayerUIManager();
    searchManager: SearchManager = new SearchManager();
    indexedDBManager: IndexedDBManager = new IndexedDBManager();
    currentListManager: CurrentListManager = new CurrentListManager();
    listManager: ListManager = new ListManager();

    // #endregion: Managers

    constructor() {
        this.BACKEND_URL = "http://localhost:8000";

        if (typeof window === "undefined") return;

        this.webSocketManager.init(this.BACKEND_URL);
    }
}

export const rockIt = new RockIt();
rockIt.queueManager.init();
rockIt.downloaderManager.init();
