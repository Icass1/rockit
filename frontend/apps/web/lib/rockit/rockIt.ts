import { EventManager, setRockIt } from "@rockit/packages/shared";
import { Http } from "@/lib/http";
import { AlbumManager } from "@/lib/managers/albumManager";
import { AuthManager } from "@/lib/managers/authManager";
import { BookmarkManager } from "@/lib/managers/bookmarkManager";
import { DownloaderManager } from "@/lib/managers/downloaderManager";
import { LibraryManager } from "@/lib/managers/libraryManager";
import { MediaManager } from "@/lib/managers/mediaManager";
import { MediaPlayerManager } from "@/lib/managers/mediaPlayerManager";
import { MediaSessionManager } from "@/lib/managers/mediaSessionManager";
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

    bookmarkManager = new BookmarkManager();
    notificationManager = new NotificationManager();
    webSocketManager = new WebSocketManager();
    userManager = new UserManager();
    searchManager = new SearchManager();
    mediaManager = new MediaManager();
    vocabularyManager = new VocabularyManager();
    stationManager = new StationManager();
    downloaderManager = new DownloaderManager();
    playlistManager = new PlaylistManager();
    albumManager = new AlbumManager();
    authManager = new AuthManager();
    mediaPlayerManager = new MediaPlayerManager();
    queueManager = new QueueManager();
    playerUIManager = new PlayerUIManager();
    eventManager = new EventManager();
    libraryManager = new LibraryManager();
    mediaSessionManager = new MediaSessionManager();
    http = Http;

    constructor() {
        setRockIt(this);
        if (typeof window === "undefined") return;
        this.webSocketManager.init();
    }

    async init(): Promise<void> {
        console.log("RockIt! int");
        rockIt.mediaPlayerManager.init();
        rockIt.queueManager.init();
        rockIt.userManager.init();
        rockIt.downloaderManager.init();
        rockIt.bookmarkManager.init();
        rockIt.libraryManager.init();
        rockIt.playlistManager.init();
        rockIt.mediaSessionManager.init();
    }
}

export const rockIt = new RockIt();

if (typeof window !== "undefined") {
    rockIt.init();
}
