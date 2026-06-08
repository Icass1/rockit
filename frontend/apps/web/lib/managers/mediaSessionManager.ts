import {
    getMediaAlbum,
    getMediaArtists,
    getMediaDuration,
    type TPlayableMedia,
} from "@rockit/shared";
import { rockIt } from "@/lib/rockit/rockIt";

export class MediaSessionManager {
    private _supported: boolean;
    private _unsubscribers: (() => void)[] = [];

    constructor() {
        this._supported =
            typeof window !== "undefined" && "mediaSession" in navigator;
    }

    init(): void {
        if (!this._supported) return;
        this._registerActionHandlers();
        this._subscribeToChanges();
    }

    destroy(): void {
        this._unsubscribers.forEach((fn): void => fn());
        this._unsubscribers = [];
    }

    private _registerActionHandlers(): void {
        const session = navigator.mediaSession;

        try {
            session.setActionHandler("play", (): void => {
                rockIt.mediaPlayerManager.play();
            });
        } catch {
            /* not supported */
        }

        try {
            session.setActionHandler("pause", (): void => {
                rockIt.mediaPlayerManager.pause();
            });
        } catch {
            /* not supported */
        }

        try {
            session.setActionHandler("previoustrack", (): void => {
                rockIt.queueManager.skipBack();
            });
        } catch {
            /* not supported */
        }

        try {
            session.setActionHandler("nexttrack", (): void => {
                rockIt.queueManager.skipForward();
            });
        } catch {
            /* not supported */
        }

        try {
            session.setActionHandler(
                "seekto",
                (details: MediaSessionActionDetails): void => {
                    const seekTime = details.seekTime;
                    if (seekTime !== null && seekTime !== undefined) {
                        rockIt.mediaPlayerManager.setCurrentTime(
                            seekTime,
                            true
                        );
                    }
                }
            );
        } catch {
            /* not supported */
        }

        try {
            session.setActionHandler("seekbackward", (): void => {
                const time = rockIt.mediaPlayerManager.currentTime;
                rockIt.mediaPlayerManager.setCurrentTime(
                    Math.max(0, time - 10),
                    true
                );
            });
        } catch {
            /* not supported */
        }

        try {
            session.setActionHandler("seekforward", (): void => {
                const time = rockIt.mediaPlayerManager.currentTime;
                rockIt.mediaPlayerManager.setCurrentTime(time + 10, true);
            });
        } catch {
            /* not supported */
        }

        try {
            session.setActionHandler("stop", (): void => {
                rockIt.mediaPlayerManager.pause();
            });
        } catch {
            /* not supported */
        }
    }

    private _subscribeToChanges(): void {
        const unsubMedia = rockIt.queueManager.currentMediaAtom.subscribe(
            (media: TPlayableMedia | undefined): void => {
                this._updateMetadata(media);
            }
        );
        this._unsubscribers.push(unsubMedia);

        const unsubPlaying = rockIt.mediaPlayerManager.playingAtom.subscribe(
            (playing: boolean): void => {
                navigator.mediaSession.playbackState = playing
                    ? "playing"
                    : "paused";
            }
        );
        this._unsubscribers.push(unsubPlaying);

        const unsubTime = rockIt.mediaPlayerManager.currentTimeAtom.subscribe(
            (time: number): void => {
                this._updatePositionState(time);
            }
        );
        this._unsubscribers.push(unsubTime);
    }

    private _updateMetadata(media: TPlayableMedia | undefined): void {
        if (!media) {
            navigator.mediaSession.metadata = null;
            return;
        }

        const artists = getMediaArtists(media);
        const artist = artists.map((a): string => a.name).join(", ");
        const album = getMediaAlbum(media);

        const artwork: MediaImage[] = media.imageUrl
            ? [
                  {
                      src: media.imageUrl,
                      sizes: "96x96",
                      type: "image/jpeg",
                  },
                  {
                      src: media.imageUrl,
                      sizes: "128x128",
                      type: "image/jpeg",
                  },
                  {
                      src: media.imageUrl,
                      sizes: "256x256",
                      type: "image/jpeg",
                  },
                  {
                      src: media.imageUrl,
                      sizes: "512x512",
                      type: "image/jpeg",
                  },
              ]
            : [];

        navigator.mediaSession.metadata = new MediaMetadata({
            title: media.name,
            artist,
            album: album?.name ?? "",
            artwork,
        });
    }

    private _updatePositionState(time: number): void {
        const media = rockIt.queueManager.currentMedia;
        const duration = getMediaDuration(media) ?? 0;

        try {
            navigator.mediaSession.setPositionState({
                duration,
                playbackRate: 1,
                position: time,
            });
        } catch {
            /* not supported */
        }
    }
}
