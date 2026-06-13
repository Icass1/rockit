import {
    EMediaContextAction,
    EMediaContextLocation,
    EMediaType,
    isDownloadable,
} from "@rockit/shared";
import type { LucideIcon } from "lucide-react";
import {
    ExternalLink,
    HardDriveDownload,
    Library,
    ListEnd,
    ListIcon,
    ListMinus,
    ListStart,
    Pencil,
    Play,
    PlayCircle,
    RefreshCw,
    Shuffle,
    Trash2,
    X,
} from "lucide-react";
import { isSearchResult, type TMediaWithSearch } from "@/models/types/media";

export interface ActionDef {
    id: EMediaContextAction;
    type: "action" | "submenu";
    icon: LucideIcon;
    labelKey: string;
    mediaTypes: EMediaType[];
    locations?: EMediaContextLocation[];
    excludeLocations?: EMediaContextLocation[];
    condition?: (media: TMediaWithSearch) => boolean;
}

type BlueprintEntry = EMediaContextAction | "---";

const ACTION_REGISTRY: ActionDef[] = [
    {
        id: EMediaContextAction.Play,
        type: "action",
        icon: Play,
        labelKey: "PLAY",
        mediaTypes: [EMediaType.Song, EMediaType.Video, EMediaType.Station],
        // Show play for all playable media, hide for search results.
        condition: (m) => !isSearchResult(m),
    },
    {
        id: EMediaContextAction.AddToPlaylist,
        type: "submenu",
        icon: ListIcon,
        labelKey: "ADD_MEDIA_TO_PLAYLIST",
        mediaTypes: [
            EMediaType.Song,
            EMediaType.Video,
            EMediaType.Station,
            EMediaType.Album,
            EMediaType.Playlist,
            EMediaType.Artist,
        ],
    },
    {
        id: EMediaContextAction.Navigate,
        type: "action",
        icon: ExternalLink,
        labelKey: "GO_TO_ALBUM",
        mediaTypes: [EMediaType.Album, EMediaType.Playlist, EMediaType.Artist],
        condition: (m) => !isSearchResult(m),
    },
    {
        id: EMediaContextAction.AddToLibrary,
        type: "action",
        icon: Library,
        labelKey: "ADD_TO_LIBRARY",
        mediaTypes: [
            EMediaType.Song,
            EMediaType.Video,
            EMediaType.Station,
            EMediaType.Album,
            EMediaType.Playlist,
            EMediaType.Artist,
        ],
        excludeLocations: [EMediaContextLocation.LIBRARY],
    },
    {
        id: EMediaContextAction.RemoveFromLibrary,
        type: "action",
        icon: Library,
        labelKey: "REMOVE_FROM_LIBRARY",
        mediaTypes: [
            EMediaType.Song,
            EMediaType.Video,
            EMediaType.Station,
            EMediaType.Album,
            EMediaType.Playlist,
            EMediaType.Artist,
        ],
        locations: [EMediaContextLocation.LIBRARY],
    },
    {
        id: EMediaContextAction.PlayList,
        type: "action",
        icon: PlayCircle,
        labelKey: "PLAY_LIST",
        mediaTypes: [EMediaType.Album, EMediaType.Playlist],
        condition: (m) => !isSearchResult(m),
    },
    {
        id: EMediaContextAction.AddToQueueTop,
        type: "action",
        icon: ListStart,
        labelKey: "ADD_LIST_TO_QUEUE",
        mediaTypes: [EMediaType.Album, EMediaType.Playlist],
        condition: (m) => !isSearchResult(m),
    },
    {
        id: EMediaContextAction.AddQueueRandom,
        type: "action",
        icon: Shuffle,
        labelKey: "ADD_LIST_RANDOMLY",
        mediaTypes: [EMediaType.Album, EMediaType.Playlist],
        condition: (m) => !isSearchResult(m),
    },
    {
        id: EMediaContextAction.AddToQueueBottom,
        type: "action",
        icon: ListEnd,
        labelKey: "ADD_LIST_TO_BOTTOM",
        mediaTypes: [EMediaType.Album, EMediaType.Playlist],
        condition: (m) => !isSearchResult(m),
    },
    {
        id: EMediaContextAction.DownloadZip,
        type: "action",
        icon: HardDriveDownload,
        labelKey: "DOWNLOAD_ZIP",
        mediaTypes: [EMediaType.Album],
        condition: (m) => !isSearchResult(m),
    },
    {
        id: EMediaContextAction.RetryDownload,
        type: "action",
        icon: RefreshCw,
        labelKey: "RETRY",
        mediaTypes: [
            EMediaType.Song,
            EMediaType.Video,
            EMediaType.Album,
            EMediaType.Playlist,
            EMediaType.Station,
            EMediaType.Artist,
        ],
        locations: [EMediaContextLocation.DOWNLOADS],
        condition: (m) => !isSearchResult(m),
    },
    {
        id: EMediaContextAction.Download,
        type: "action",
        icon: HardDriveDownload,
        labelKey: "DOWNLOAD",
        mediaTypes: [EMediaType.Song, EMediaType.Video],
        condition: (m) =>
            !isSearchResult(m) && isDownloadable(m) && !m.downloaded,
    },
    {
        id: EMediaContextAction.RemoveFromQueue,
        type: "action",
        icon: X,
        labelKey: "REMOVE_FROM_QUEUE",
        mediaTypes: [EMediaType.Song, EMediaType.Video, EMediaType.Station],
        locations: [EMediaContextLocation.QUEUE],
        condition: (m) => !isSearchResult(m),
    },
    {
        id: EMediaContextAction.AddSongToQueueTop,
        type: "action",
        icon: ListStart,
        labelKey: "ADD_SONG_TO_QUEUE",
        mediaTypes: [EMediaType.Song, EMediaType.Video, EMediaType.Station],
        condition: (m) => !isSearchResult(m),
    },
    {
        id: EMediaContextAction.AddMediaQueueRandom,
        type: "action",
        icon: Shuffle,
        labelKey: "ADD_LIST_RANDOMLY",
        mediaTypes: [EMediaType.Song, EMediaType.Video, EMediaType.Station],
        condition: (m) => !isSearchResult(m),
    },
    {
        id: EMediaContextAction.AddMediaToQueueBottom,
        type: "action",
        icon: ListEnd,
        labelKey: "ADD_LIST_TO_BOTTOM",
        mediaTypes: [EMediaType.Song, EMediaType.Video, EMediaType.Station],
        condition: (m) => !isSearchResult(m),
    },
    {
        id: EMediaContextAction.Redownload,
        type: "action",
        icon: HardDriveDownload,
        labelKey: "REDOWNLOAD",
        mediaTypes: [EMediaType.Song, EMediaType.Video],
        condition: (m) =>
            !isSearchResult(m) && isDownloadable(m) && Boolean(m.downloaded),
    },
    {
        id: EMediaContextAction.Delete,
        type: "action",
        icon: Trash2,
        labelKey: "DELETE",
        mediaTypes: [EMediaType.Song, EMediaType.Video],
        condition: (m) =>
            !isSearchResult(m) && isDownloadable(m) && Boolean(m.downloaded),
    },
    {
        id: EMediaContextAction.RemoveFromPlaylist,
        type: "action",
        icon: ListMinus,
        labelKey: "REMOVE_FROM_PLAYLIST",
        mediaTypes: [EMediaType.Song, EMediaType.Video, EMediaType.Station],
        locations: [EMediaContextLocation.PLAYLIST],
        condition: (m) => !isSearchResult(m),
    },
    {
        id: EMediaContextAction.EditMetadata,
        type: "action",
        icon: Pencil,
        labelKey: "EDIT_METADATA",
        mediaTypes: [
            EMediaType.Song,
            EMediaType.Video,
            EMediaType.Album,
            EMediaType.Artist,
        ],
        condition: (m) => !isSearchResult(m),
    },
];

const ACTION_MAP = new Map<EMediaContextAction, ActionDef>(
    ACTION_REGISTRY.map((a) => [a.id, a])
);

function findAction(id: EMediaContextAction): ActionDef | undefined {
    return ACTION_MAP.get(id);
}

const MEDIA_BLUEPRINTS: Partial<Record<EMediaType, BlueprintEntry[]>> = {
    [EMediaType.Song]: [
        EMediaContextAction.Play,
        EMediaContextAction.AddToPlaylist,
        "---",
        EMediaContextAction.AddSongToQueueTop,
        EMediaContextAction.AddMediaQueueRandom,
        EMediaContextAction.AddMediaToQueueBottom,
        "---",
        EMediaContextAction.EditMetadata,
        "---",
        EMediaContextAction.AddToLibrary,
        EMediaContextAction.RemoveFromLibrary,
        "---",
        EMediaContextAction.Download,
        EMediaContextAction.RetryDownload,
        EMediaContextAction.Redownload,
        EMediaContextAction.Delete,
        EMediaContextAction.RemoveFromQueue,
        EMediaContextAction.RemoveFromPlaylist,
    ],
    [EMediaType.Video]: [
        EMediaContextAction.Play,
        EMediaContextAction.AddToPlaylist,
        "---",
        EMediaContextAction.AddSongToQueueTop,
        EMediaContextAction.AddMediaQueueRandom,
        EMediaContextAction.AddMediaToQueueBottom,
        "---",
        EMediaContextAction.EditMetadata,
        "---",
        EMediaContextAction.AddToLibrary,
        EMediaContextAction.RemoveFromLibrary,
        "---",
        EMediaContextAction.Download,
        EMediaContextAction.RetryDownload,
        EMediaContextAction.Redownload,
        EMediaContextAction.Delete,
        EMediaContextAction.RemoveFromQueue,
        EMediaContextAction.RemoveFromPlaylist,
    ],
    [EMediaType.Station]: [
        EMediaContextAction.Play,
        EMediaContextAction.AddToPlaylist,
        "---",
        EMediaContextAction.AddSongToQueueTop,
        EMediaContextAction.AddMediaQueueRandom,
        EMediaContextAction.AddMediaToQueueBottom,
        "---",
        EMediaContextAction.AddToLibrary,
        EMediaContextAction.RemoveFromLibrary,
        EMediaContextAction.RemoveFromQueue,
        EMediaContextAction.RemoveFromPlaylist,
    ],
    [EMediaType.Album]: [
        EMediaContextAction.PlayList,
        EMediaContextAction.AddToPlaylist,
        EMediaContextAction.Navigate,
        "---",
        EMediaContextAction.EditMetadata,
        "---",
        EMediaContextAction.AddToLibrary,
        EMediaContextAction.RemoveFromLibrary,
        "---",
        EMediaContextAction.AddToQueueTop,
        EMediaContextAction.AddQueueRandom,
        EMediaContextAction.AddToQueueBottom,
        "---",
        EMediaContextAction.DownloadZip,
    ],
    [EMediaType.Playlist]: [
        EMediaContextAction.PlayList,
        EMediaContextAction.AddToPlaylist,
        EMediaContextAction.Navigate,
        "---",
        EMediaContextAction.AddToLibrary,
        EMediaContextAction.RemoveFromLibrary,
        "---",
        EMediaContextAction.AddToQueueTop,
        EMediaContextAction.AddQueueRandom,
        EMediaContextAction.AddToQueueBottom,
    ],
    [EMediaType.Artist]: [
        EMediaContextAction.AddToPlaylist,
        EMediaContextAction.Navigate,
        "---",
        EMediaContextAction.EditMetadata,
        "---",
        EMediaContextAction.AddToLibrary,
    ],
};

export function getActionsForMedia(
    media: TMediaWithSearch,
    location: EMediaContextLocation
): (ActionDef | { type: "separator" })[] {
    const blueprint = MEDIA_BLUEPRINTS[media.type as EMediaType] ?? [];

    const raw = blueprint.map(
        (entry): ActionDef | { type: "separator" } | null => {
            if (entry === "---") return { type: "separator" };
            const action = findAction(entry);
            if (!action) return null;
            return action;
        }
    );

    const visible = raw.filter(
        (item): item is ActionDef | { type: "separator" } => {
            if (!item) return false;
            if (item.type === "separator") return true;
            if (!item.mediaTypes.includes(media.type as EMediaType))
                return false;
            if (item.locations && !item.locations.includes(location))
                return false;
            if (
                item.excludeLocations &&
                item.excludeLocations.includes(location)
            )
                return false;
            if (item.condition && !item.condition(media)) return false;
            return true;
        }
    );

    return visible.filter((item, index, arr) => {
        if (item.type !== "separator") return true;
        if (index === 0 || index === arr.length - 1) return false;
        if (arr[index - 1].type === "separator") return false;
        return true;
    });
}
