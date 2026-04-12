import { EEvent } from "../enums/events";
import { IMediaAddedToLibraryEvent } from "./events/mediaAddedToLibrary";
import { IMediaAddedToPlaylistEvent } from "./events/mediaAddedToPlaylist";
import { IMediaDownloadedEvent } from "./events/mediaDownloaded";
import { IMediaDownloadStatus } from "./events/mediaDownloadStatus";
import { IPlaylistCreatedEvent } from "./events/playlistCreated";
import { ISongFinishedEvent } from "./events/songFinished";
import { IUserLoginEvent } from "./events/userLogin";
import { IVolumeChangedEvent } from "./events/volumeChanged";

export interface IEventPayloadMap {
    [EEvent.UserLogin]: IUserLoginEvent;
    [EEvent.SongFinished]: ISongFinishedEvent;
    [EEvent.VolumeChanged]: IVolumeChangedEvent;
    [EEvent.PlaylistCreated]: IPlaylistCreatedEvent;
    [EEvent.MediaAddedToPlaylist]: IMediaAddedToPlaylistEvent;
    [EEvent.MediaDownloaded]: IMediaDownloadedEvent;
    [EEvent.MediaDownloadStatus]: IMediaDownloadStatus;
    [EEvent.MediaAddedToLibrary]: IMediaAddedToLibraryEvent;
}
