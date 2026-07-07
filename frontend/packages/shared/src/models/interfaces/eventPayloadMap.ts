import { EEvent } from "@/models/enums/events";
import { IMediaAddedToLibraryEvent } from "@/models/interfaces/events/mediaAddedToLibrary";
import { IMediaAddedToPlaylistEvent } from "@/models/interfaces/events/mediaAddedToPlaylist";
import { IMediaDownloadedEvent } from "@/models/interfaces/events/mediaDownloaded";
import { IMediaDownloadStatus } from "@/models/interfaces/events/mediaDownloadStatus";
import { IMediaRemovedFromLibraryEvent } from "@/models/interfaces/events/mediaRemovedFromLibrary";
import { IPlaylistCreatedEvent } from "@/models/interfaces/events/playlistCreated";
import { IPlaylistDeletedEvent } from "@/models/interfaces/events/playlistDeleted";
import { IPlaylistRenamedEvent } from "@/models/interfaces/events/playlistRenamed";
import { ISongFinishedEvent } from "@/models/interfaces/events/songFinished";
import { IUserLoginEvent } from "@/models/interfaces/events/userLogin";
import { IVolumeChangedEvent } from "@/models/interfaces/events/volumeChanged";

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
