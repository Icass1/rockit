import {
    EMediaContextLocation,
    EMediaType,
    isDownloadable,
} from "@rockit/shared";
import {
    ExternalLink,
    HardDriveDownload,
    Library,
    ListEnd,
    ListIcon,
    ListMinus,
    ListStart,
    Play,
    PlayCircle,
    RefreshCw,
    Shuffle,
    X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { isSearchResult, type TMediaWithSearch } from "@/models/types/media";

export type ActionId =
    | "play"
    | "addToPlaylist"
    | "navigate"
    | "addToLibrary"
    | "removeFromLibrary"
    | "playList"
    | "addToQueueTop"
    | "addQueueRandom"
    | "addToQueueBottom"
    | "downloadZip"
    | "retryDownload"
    | "download"
    | "removeFromQueue"
    | "addSongToQueueTop"
    | "addSongQueueRandom"
    | "addSongToQueueBottom"
    | "removeFromPlaylist";

export interface ActionDef {
    id: ActionId;
    type: "action" | "submenu";
    icon: LucideIcon;
    labelKey: string;
    mediaTypes: EMediaType[];
    locations?: EMediaContextLocation[];
    excludeLocations?: EMediaContextLocation[];
    condition?: (media: TMediaWithSearch) => boolean;
}

type BlueprintEntry = ActionId | "---";

const ACTION_REGISTRY: ActionDef[] = [
    {
        id: "play",
        type: "action",
        icon: Play,
        labelKey: "PLAY",
        mediaTypes: [EMediaType.Song, EMediaType.Video, EMediaType.Station],
        // Show play for all playable media, hide for search results.
        condition: (m) => !isSearchResult(m),
    },
    {
        id: "addToPlaylist",
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
        id: "navigate",
        type: "action",
        icon: ExternalLink,
        labelKey: "GO_TO_ALBUM",
        mediaTypes: [EMediaType.Album, EMediaType.Playlist, EMediaType.Artist],
        condition: (m) => !isSearchResult(m),
    },
    {
        id: "addToLibrary",
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
        id: "removeFromLibrary",
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
        id: "playList",
        type: "action",
        icon: PlayCircle,
        labelKey: "PLAY_LIST",
        mediaTypes: [EMediaType.Album, EMediaType.Playlist],
        condition: (m) => !isSearchResult(m),
    },
    {
        id: "addToQueueTop",
        type: "action",
        icon: ListStart,
        labelKey: "ADD_LIST_TO_QUEUE",
        mediaTypes: [EMediaType.Album, EMediaType.Playlist],
        condition: (m) => !isSearchResult(m),
    },
    {
        id: "addQueueRandom",
        type: "action",
        icon: Shuffle,
        labelKey: "ADD_LIST_RANDOMLY",
        mediaTypes: [EMediaType.Album, EMediaType.Playlist],
        condition: (m) => !isSearchResult(m),
    },
    {
        id: "addToQueueBottom",
        type: "action",
        icon: ListEnd,
        labelKey: "ADD_LIST_TO_BOTTOM",
        mediaTypes: [EMediaType.Album, EMediaType.Playlist],
        condition: (m) => !isSearchResult(m),
    },
    {
        id: "downloadZip",
        type: "action",
        icon: HardDriveDownload,
        labelKey: "DOWNLOAD_ZIP",
        mediaTypes: [EMediaType.Album],
        condition: (m) => !isSearchResult(m),
    },
    {
        id: "retryDownload",
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
        id: "download",
        type: "action",
        icon: HardDriveDownload,
        labelKey: "DOWNLOAD",
        mediaTypes: [EMediaType.Song, EMediaType.Video],
        condition: (m) =>
            !isSearchResult(m) && isDownloadable(m) && !m.downloaded,
    },
    {
        id: "removeFromQueue",
        type: "action",
        icon: X,
        labelKey: "REMOVE_FROM_QUEUE",
        mediaTypes: [EMediaType.Song, EMediaType.Video, EMediaType.Station],
        locations: [EMediaContextLocation.QUEUE],
        condition: (m) => !isSearchResult(m),
    },
    {
        id: "addSongToQueueTop",
        type: "action",
        icon: ListStart,
        labelKey: "ADD_SONG_TO_QUEUE",
        mediaTypes: [EMediaType.Song, EMediaType.Video, EMediaType.Station],
        condition: (m) => !isSearchResult(m),
    },
    {
        id: "addSongQueueRandom",
        type: "action",
        icon: Shuffle,
        labelKey: "ADD_LIST_RANDOMLY",
        mediaTypes: [EMediaType.Song, EMediaType.Video, EMediaType.Station],
        condition: (m) => !isSearchResult(m),
    },
    {
        id: "addSongToQueueBottom",
        type: "action",
        icon: ListEnd,
        labelKey: "ADD_LIST_TO_BOTTOM",
        mediaTypes: [EMediaType.Song, EMediaType.Video, EMediaType.Station],
        condition: (m) => !isSearchResult(m),
    },
    {
        id: "removeFromPlaylist",
        type: "action",
        icon: ListMinus,
        labelKey: "REMOVE_FROM_PLAYLIST",
        mediaTypes: [EMediaType.Song, EMediaType.Video, EMediaType.Station],
        locations: [EMediaContextLocation.PLAYLIST],
        condition: (m) => !isSearchResult(m),
    },
];

const ACTION_MAP = new Map<ActionId, ActionDef>(
    ACTION_REGISTRY.map((a) => [a.id, a])
);

function findAction(id: ActionId): ActionDef | undefined {
    return ACTION_MAP.get(id);
}

const MEDIA_BLUEPRINTS: Partial<Record<EMediaType, BlueprintEntry[]>> = {
    [EMediaType.Song]: [
        "play",
        "addToPlaylist",
        "---",
        "addSongToQueueTop",
        "addSongQueueRandom",
        "addSongToQueueBottom",
        "---",
        "addToLibrary",
        "removeFromLibrary",
        "---",
        "download",
        "retryDownload",
        "removeFromQueue",
        "removeFromPlaylist",
    ],
    [EMediaType.Video]: [
        "play",
        "addToPlaylist",
        "---",
        "addSongToQueueTop",
        "addSongQueueRandom",
        "addSongToQueueBottom",
        "---",
        "addToLibrary",
        "removeFromLibrary",
        "---",
        "download",
        "retryDownload",
        "removeFromQueue",
        "removeFromPlaylist",
    ],
    [EMediaType.Station]: [
        "play",
        "addToPlaylist",
        "---",
        "addSongToQueueTop",
        "addSongQueueRandom",
        "addSongToQueueBottom",
        "---",
        "addToLibrary",
        "removeFromLibrary",
        "removeFromQueue",
        "removeFromPlaylist",
    ],
    [EMediaType.Album]: [
        "playList",
        "addToPlaylist",
        "navigate",
        "---",
        "addToLibrary",
        "removeFromLibrary",
        "---",
        "addToQueueTop",
        "addQueueRandom",
        "addToQueueBottom",
        "---",
        "downloadZip",
    ],
    [EMediaType.Playlist]: [
        "playList",
        "addToPlaylist",
        "navigate",
        "---",
        "addToLibrary",
        "removeFromLibrary",
        "---",
        "addToQueueTop",
        "addQueueRandom",
        "addToQueueBottom",
    ],
    [EMediaType.Artist]: ["addToPlaylist", "navigate", "---", "addToLibrary"],
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
