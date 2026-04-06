import { EEvent } from "@/models/enums/events";
import { IMediaAddedToPlaylistEvent } from "@/models/interfaces/events/mediaAddedToPlaylist";
import { IMediaDownloadedEvent } from "@/models/interfaces/events/mediaDownloaded";
import { IMediaDownloadStatus } from "@/models/interfaces/events/mediaDownloadStatus";
import { IPlaylistCreatedEvent } from "@/models/interfaces/events/playlistCreated";
import { ISongFinishedEvent } from "@/models/interfaces/events/songFinished";
import { IUserLoginEvent } from "@/models/interfaces/events/userLogin";
import { IVolumeChangedEvent } from "@/models/interfaces/events/volumeChanged";

export interface IEventPayloadMap {
    [EEvent.UserLogin]: IUserLoginEvent;
    [EEvent.SongFinished]: ISongFinishedEvent;
    [EEvent.VolumeChanged]: IVolumeChangedEvent;
    [EEvent.PlaylistCreated]: IPlaylistCreatedEvent;
    [EEvent.MediaAddedToPlaylist]: IMediaAddedToPlaylistEvent;
    [EEvent.MediaDownloaded]: IMediaDownloadedEvent;
    [EEvent.MediaDownloadStatus]: IMediaDownloadStatus;
}
