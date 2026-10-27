"use client";

import { useState, type JSX } from "react";
import Image from "next/image";
import { useStore } from "@nanostores/react";
import {
    EMediaContextLocation,
    isSearchResult,
    type BaseSearchResultsItem,
    type BaseStationResponse,
} from "@rockit/shared";
import {
    AudioLines,
    Check,
    Library,
    ListEnd,
    LoaderCircle,
    MoreHorizontal,
    Pause,
    Play,
} from "lucide-react";
import { rockIt } from "@/lib/rockit/rockIt";
import MediaContextMenu from "@/components/MediaContextMenu/MediaContextMenu";

export default function RadioStationItem({
    station,
    list,
    saved,
    onSaved,
}: {
    station: BaseStationResponse | BaseSearchResultsItem;
    list: boolean;
    saved: boolean;
    onSaved: () => void;
}): JSX.Element {
    const v = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const current = useStore(rockIt.queueManager.currentMediaAtom);
    const playing = useStore(rockIt.mediaPlayerManager.playingAtom);
    const loading = useStore(rockIt.mediaPlayerManager.loadingAtom);
    const [busy, setBusy] = useState(false);
    const [image, setImage] = useState(
        station.imageUrl?.trim() || "/radio-placeholder.png"
    );
    const id = isSearchResult(station)
        ? (station.url || station.providerUrl).split("/").pop()
        : station.publicId;
    const active = current?.publicId === id;
    const play = (): void => {
        if (active) rockIt.mediaPlayerManager.togglePlayPause();
        else if (isSearchResult(station) && id)
            void rockIt.stationManager.playStationByPublicId(id);
        else if (!isSearchResult(station))
            void rockIt.stationManager.setAndPlayStation(station);
    };
    const act = async (action: "save" | "queue"): Promise<void> => {
        setBusy(true);
        try {
            const resolved = await rockIt.stationManager.resolve(station);
            if (action === "queue") rockIt.queueManager.addMediaToEnd(resolved);
            else {
                if (saved)
                    await rockIt.libraryManager.removeMediaFromLibrary(
                        resolved
                    );
                else await rockIt.libraryManager.addMediaToLibrary(resolved);
                onSaved();
            }
        } catch (error) {
            rockIt.notificationManager.notifyError(
                error instanceof Error ? error.message : v.RADIO_LOAD_ERROR
            );
        } finally {
            setBusy(false);
        }
    };
    return (
        <article
            className={`min-w-0 rounded-xl border p-3 transition ${active ? "border-pink-500/50 bg-pink-500/10" : "border-white/5 bg-neutral-900/70 hover:border-white/15"} ${list ? "flex flex-wrap items-center gap-3" : "flex flex-col"}`}
        >
            <button
                onClick={play}
                aria-label={`${active && playing ? v.PAUSE : v.PLAY}: ${station.name}`}
                className={`group relative shrink-0 cursor-pointer overflow-hidden rounded-lg focus-visible:outline-2 focus-visible:outline-pink-500 ${list ? "h-14 w-14" : "aspect-square w-full"}`}
            >
                <Image
                    src={image}
                    alt=""
                    width={250}
                    height={250}
                    unoptimized
                    loading="lazy"
                    className="h-full w-full object-cover"
                    onError={(): void => setImage("/radio-placeholder.png")}
                />
                <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                    {active && loading ? (
                        <LoaderCircle className="h-8 w-8 animate-spin text-white" />
                    ) : active && playing ? (
                        <Pause className="h-8 w-8 fill-white text-white" />
                    ) : (
                        <Play className="h-8 w-8 fill-white text-white" />
                    )}
                </span>
            </button>
            <div className={`min-w-0 flex-1 ${list ? "" : "mt-3"}`}>
                <div className="flex min-w-0 items-center gap-1.5">
                    {active && (
                        <AudioLines
                            className="h-3.5 w-3.5 shrink-0 text-pink-400"
                            aria-hidden="true"
                        />
                    )}
                    <button
                        onClick={play}
                        aria-label={`${active && playing ? v.PAUSE : v.PLAY}: ${station.name}`}
                        aria-current={active ? "true" : undefined}
                        className="block min-w-0 flex-1 cursor-pointer truncate text-left text-sm font-semibold text-white"
                        title={station.name}
                    >
                        {station.name}
                    </button>
                </div>
                <p className="truncate text-xs text-neutral-400">
                    {active && playing
                        ? v.LIVE
                        : !isSearchResult(station)
                          ? [
                                station.country,
                                station.codec,
                                station.bitrate
                                    ? `${station.bitrate} kbps`
                                    : null,
                            ]
                                .filter(Boolean)
                                .join(" · ") || v.RADIO_STATION
                          : v.RADIO_STATION}
                </p>
            </div>
            <div className={`flex shrink-0 items-center ${list ? "" : "mt-2"}`}>
                <button
                    disabled={busy}
                    onClick={(): void => {
                        void act("save");
                    }}
                    aria-label={
                        saved ? v.REMOVE_FROM_LIBRARY : v.ADD_TO_LIBRARY
                    }
                    title={saved ? v.REMOVE_FROM_LIBRARY : v.ADD_TO_LIBRARY}
                    aria-pressed={saved}
                    className={`flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg hover:bg-white/10 disabled:opacity-40 ${saved ? "text-pink-400" : "text-neutral-400"}`}
                >
                    {busy ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : saved ? (
                        <Check className="h-4 w-4" />
                    ) : (
                        <Library className="h-4 w-4" />
                    )}
                </button>
                <button
                    disabled={busy}
                    onClick={(): void => {
                        void act("queue");
                    }}
                    aria-label={v.ADD_TO_QUEUE}
                    title={v.ADD_TO_QUEUE}
                    className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg text-neutral-400 hover:bg-white/10 disabled:opacity-40"
                >
                    <ListEnd className="h-4 w-4" />
                </button>
                {!isSearchResult(station) && (
                    <MediaContextMenu
                        media={station}
                        location={
                            saved
                                ? EMediaContextLocation.LIBRARY
                                : EMediaContextLocation.SEARCH
                        }
                        openOnLeftClick
                    >
                        <button
                            aria-label={station.name}
                            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg text-neutral-400 hover:bg-white/10"
                        >
                            <MoreHorizontal className="h-4 w-4" />
                        </button>
                    </MediaContextMenu>
                )}
            </div>
        </article>
    );
}
