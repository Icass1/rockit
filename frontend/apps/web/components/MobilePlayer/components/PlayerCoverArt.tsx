"use client";

import { useCallback, useEffect, useRef, type JSX } from "react";
import { useStore } from "@nanostores/react";
import { type TPlayableMedia } from "@rockit/shared";
import { useReducedMotion } from "framer-motion";
import { Disc3, DiscAlbum } from "lucide-react";
import { rockIt } from "@/lib/rockit/rockIt";
import VinylRecord from "@/components/PlayerUI/VinylRecord";
import VinylTransition from "@/components/PlayerUI/VinylTransition";

interface PlayerCoverArtProps {
    uri: string | undefined;
    mediaType: string | undefined;
    media?: TPlayableMedia;
}

function aspectClass(mediaType: string | undefined): string {
    if (mediaType === "video") return "aspect-video rounded-xl";
    if (mediaType === "radio") return "aspect-square rounded-full";
    return "aspect-square rounded-2xl";
}

export default function PlayerCoverArt({
    uri,
    mediaType,
    media,
}: PlayerCoverArtProps): JSX.Element {
    const coverUri =
        uri ||
        (mediaType === "station" || mediaType === "radio"
            ? "/radio-placeholder.png"
            : undefined);
    const audioOnly = useStore(rockIt.mediaPlayerManager.audioOnlyAtom);
    const playing = useStore(rockIt.mediaPlayerManager.playingAtom);
    const reducedMotion = useReducedMotion();
    const vinylMode = useStore(rockIt.playerUIManager.vinylModeAtom);
    const vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const lang = useStore(rockIt.vocabularyManager.langAtom);
    const canShowVinyl = media?.type === "song" && !!coverUri;
    const showVinyl = canShowVinyl && vinylMode;
    const labelKey = vinylMode ? "PLAYER_SHOW_COVER" : "PLAYER_SHOW_VINYL";
    const translatedLabel = (vocabulary as unknown as Record<string, string>)[
        labelKey
    ];
    const toggleLabel =
        translatedLabel && translatedLabel !== labelKey
            ? translatedLabel
            : lang.startsWith("es")
              ? vinylMode
                  ? "Mostrar carátula"
                  : "Mostrar vinilo"
              : vinylMode
                ? "Show cover"
                : "Show vinyl";
    useEffect((): void => {
        rockIt.playerUIManager.initializeArtworkMode();
    }, []);
    const videoContainerRef = useRef<HTMLDivElement>(null);
    const showVideo = mediaType === "video" && !audioOnly;

    const attachVideoRef = useCallback(
        (container: HTMLDivElement | null): void => {
            const previous = videoContainerRef.current;
            if (previous) {
                rockIt.mediaPlayerManager.detachVideoFromContainer(previous);
            }
            videoContainerRef.current = container;
            if (container && showVideo) {
                rockIt.mediaPlayerManager.attachVideoToContainer(container);
            }
        },
        [showVideo]
    );

    return (
        <div
            className={`relative mx-auto w-full max-w-85 overflow-hidden bg-(--color-surface) shadow-xl ${aspectClass(mediaType)}`}
        >
            {showVinyl && media ? (
                <div className="absolute inset-0">
                    <VinylTransition media={media}>
                        <VinylRecord
                            imageUrl={coverUri || "/song-placeholder.png"}
                            name={media.name}
                            artists={media.artists}
                            isPlaying={playing && !reducedMotion}
                        />
                    </VinylTransition>
                </div>
            ) : showVideo ? (
                <div ref={attachVideoRef} className="absolute inset-0" />
            ) : coverUri ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={coverUri}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="eager"
                />
            ) : (
                <div className="h-full w-full bg-(--color-surface)" />
            )}
            {canShowVinyl && (
                <button
                    type="button"
                    aria-label={toggleLabel}
                    aria-pressed={showVinyl}
                    onPointerDown={(event): void => event.stopPropagation()}
                    onClick={(event): void => {
                        event.stopPropagation();
                        rockIt.playerUIManager.toggleVinylMode();
                    }}
                    className="absolute right-2 bottom-2 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-black/65 text-white shadow-lg focus-visible:outline-2 focus-visible:outline-white"
                >
                    {showVinyl ? (
                        <DiscAlbum aria-hidden className="h-6 w-6" />
                    ) : (
                        <Disc3 aria-hidden className="h-6 w-6" />
                    )}
                </button>
            )}
        </div>
    );
}
