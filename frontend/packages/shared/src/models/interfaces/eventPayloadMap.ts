import { EEvent } from "../enums/events";
import { IMediaAddedToLibraryEvent } from "./events/mediaAddedToLibrary";
import { IMediaAddedToPlaylistEvent } from "./events/mediaAddedToPlaylist";
import { IMediaDownloadedEvent } from "./events/mediaDownloaded";
import { IMediaDownloadStatus } from "./events/mediaDownloadStatus";
import { IMediaRemovedFromLibraryEvent } from "./events/mediaRemovedFromLibrary";
import { IPlaylistCreatedEvent } from "./events/playlistCreated";
import { IPlaylistDeletedEvent } from "./events/playlistDeleted";
import { IPlaylistRenamedEvent } from "./events/playlistRenamed";
import { ISongFinishedEvent } from "./events/songFinished";
import { IUserLoginEvent } from "./events/userLogin";
import { IVolumeChangedEvent } from "./events/volumeChanged";

export interface IEventPayloadMap {
    [EEvent.UserLogin]: IUserLoginEvent;
    [EEvent.SongFinished]: ISongFinishedEvent;
    [EEvent.VolumeChanged]: IVolumeChangedEvent;
    [EEvent.PlaylistCreated]: IPlaylistCreatedEvent;
    [EEvent.PlaylistRenamed]: IPlaylistRenamedEvent;
    [EEvent.PlaylistDeleted]: IPlaylistDeletedEvent;
    [EEvent.MediaAddedToPlaylist]: IMediaAddedToPlaylistEvent;
    [EEvent.MediaDownloaded]: IMediaDownloadedEvent;
    [EEvent.MediaDownloadStatus]: IMediaDownloadStatus;
    [EEvent.MediaAddedToLibrary]: IMediaAddedToLibraryEvent;
    [EEvent.MediaRemovedFromLibrary]: IMediaRemovedFromLibraryEvent;
}
