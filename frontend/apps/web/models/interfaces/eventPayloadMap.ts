import { EEvent } from "@/models/enums/events";
import { IPlaylistCreatedEvent } from "@/models/interfaces/events/playlistCreated";
import { ISongFinishedEvent } from "@/models/interfaces/events/songFinished";
import { IUserLoginEvent } from "@/models/interfaces/events/userLogin";
import { IVolumeChangedEvent } from "@/models/interfaces/events/volumeChanged";

export interface IEventPayloadMap {
    [EEvent.UserLogin]: IUserLoginEvent;
    [EEvent.SongFinished]: ISongFinishedEvent;
    [EEvent.VolumeChanged]: IVolumeChangedEvent;
    [EEvent.PlaylistCreated]: IPlaylistCreatedEvent;
}
