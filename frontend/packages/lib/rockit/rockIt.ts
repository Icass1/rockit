import { BACKEND_URL } from "@/environment";
import { AlbumManager } from "@/packages/lib/managers/albumManager";
import { AudioManager } from "@/packages/lib/managers/audioManager";
import { CurrentListManager } from "@/packages/lib/managers/currentListManager";
import { DownloaderManager } from "@/packages/lib/managers/downloaderManager";
import { IndexedDBManager } from "@/packages/lib/managers/indexedDBManager";
import { ListManager } from "@/packages/lib/managers/listManager";
import { MediaManager } from "@/packages/lib/managers/mediaManager";
import { NotificationManager } from "@/packages/lib/managers/notificationManager";
import { PlayerUIManager } from "@/packages/lib/managers/playerUIManager";
import { PlaylistManager } from "@/packages/lib/managers/playlistManager";
import { QueueManager } from "@/packages/lib/managers/queueManager";
import { SearchManager } from "@/packages/lib/managers/searchManager";
import { ServiceWorkerManager } from "@/packages/lib/managers/serviceWorkerManager";
import { StationManager } from "@/packages/lib/managers/stationManager";
import { UserManager } from "@/packages/lib/managers/userManager";
import { VocabularyManager } from "@/packages/lib/managers/vocabularyManager";
import { WebSocketManager } from "@/packages/lib/managers/webSocketManger";

export const RESPONSE_UNDEFINED_MESSAGE = "Response is undefined.";

export class RockIt {
    // #region: Constants

    public readonly VERSION = "0.1.0";
    public readonly PLAYLIST_PLACEHOLDER_IMAGE_URL =
        "/playlist-placeholder.png";
    public readonly ALBUM_PLACEHOLDER_IMAGE_URL =
        BACKEND_URL + "/image/album-placeholder.png";
    public readonly MEDIA_PLACEHOLDER_IMAGE_URL =
        BACKEND_URL + "/image/song-placeholder.png";
    public readonly SONG_PLACEHOLDER_IMAGE_URL =
        BACKEND_URL + "/image/song-placeholder.png";
    public readonly STATION_PLACEHOLDER_IMAGE_URL =
        BACKEND_URL + "/image/radio-placeholder.png";
    public readonly USER_PLACEHOLDER_IMAGE_URL =
        BACKEND_URL + "/image/user-placeholder.png";
    // #endregion: Constants

    // #region: Managers

    audioManager: AudioManager = new AudioManager();
    mediaManager: MediaManager = new MediaManager();
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
    vocabularyManager: VocabularyManager = new VocabularyManager();

    // #endregion: Managers

    constructor() {
        if (typeof window === "undefined") return;

        this.webSocketManager.init();
    }
}

export const rockIt = new RockIt();
rockIt.queueManager.init();
rockIt.userManager.init();
