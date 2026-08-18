import { EPlatform } from "@/shared/models/enums/platform";
import { DeviceEventEmitter, NativeModules, Platform } from "react-native";

// Commands emitted by Android Auto's MediaSession callback
export type AutoCommand =
    | "play"
    | "pause"
    | "stop"
    | "next"
    | "previous"
    | "seekTo"
    | "skipToIndex";

interface NativeMediaBridgeCallbacks {
    onBluetoothConnected: () => void;
    onBluetoothDisconnected: () => void;
    onAutoPlay: () => void;
    onAutoPause: () => void;
    // Fired by the notification's Stop action (or the OS media Stop
    // transport control). The native side already tears down the
    // foreground service/notification itself — this just keeps the
    // in-app player state in sync.
    onAutoStop: () => void;
    onAutoNext: () => void;
    onAutoPrevious: () => void;
    onAutoSeekTo: (seconds: number) => void;
    onAutoSkipToIndex: (index: number) => void;
    // Fired when the native side sees the Bluetooth output device get
    // re-added while media is playing — a possible silent A2DP route drop
    // recovering on its own (see RockItAutoMediaService.kt).
    onAudioRouteChanged: () => void;
}

export interface AutoQueueItem {
    mediaId: string;
    title: string;
    artist: string;
    album: string;
    artworkUrl: string;
    duration: number; // milliseconds
}

class NativeMediaBridgeClass {
    private callbacks: NativeMediaBridgeCallbacks | null = null;
    private subscriptions: { remove: () => void }[] = [];
    private isSetUp = false;

    setup(callbacks: NativeMediaBridgeCallbacks) {
        this.callbacks = callbacks;
        if (Platform.OS !== EPlatform.Android || this.isSetUp) return;
        this.isSetUp = true;

        this.subscriptions.push(
            DeviceEventEmitter.addListener("bluetoothConnected", () =>
                this.callbacks?.onBluetoothConnected()
            ),
            DeviceEventEmitter.addListener("bluetoothDisconnected", () =>
                this.callbacks?.onBluetoothDisconnected()
            ),
            DeviceEventEmitter.addListener(
                "autoCommand",
                (cmd: AutoCommand) => {
                    switch (cmd) {
                        case "play":
                            return this.callbacks?.onAutoPlay();
                        case "pause":
                            return this.callbacks?.onAutoPause();
                        case "stop":
                            return this.callbacks?.onAutoStop();
                        case "next":
                            return this.callbacks?.onAutoNext();
                        case "previous":
                            return this.callbacks?.onAutoPrevious();
                    }
                }
            ),
            DeviceEventEmitter.addListener(
                "autoCommandData_seekTo",
                (seconds: number) => this.callbacks?.onAutoSeekTo(seconds)
            ),
            DeviceEventEmitter.addListener(
                "autoCommandData_skipToIndex",
                (index: number) => this.callbacks?.onAutoSkipToIndex(index)
            ),
            DeviceEventEmitter.addListener("audioRouteChanged", () =>
                this.callbacks?.onAudioRouteChanged()
            )
        );
    }

    dispose() {
        this.subscriptions.forEach((s) => s.remove());
        this.subscriptions = [];
        this.isSetUp = false;
        this.callbacks = null;
    }

    updateNowPlaying(
        title: string,
        artist: string,
        album: string,
        artworkUrl: string,
        durationMs: number | undefined
    ) {
        if (Platform.OS !== EPlatform.Android) return;
        NativeModules.RockItMedia?.updateNowPlaying(
            title,
            artist,
            album,
            artworkUrl,
            durationMs ?? 0
        );
    }

    updatePlaybackState(isPlaying: boolean, positionMs: number) {
        if (Platform.OS !== EPlatform.Android) return;
        NativeModules.RockItMedia?.updatePlaybackState(isPlaying, positionMs);
    }

    updateQueue(queue: AutoQueueItem[], currentIndex: number) {
        if (Platform.OS !== EPlatform.Android) return;
        NativeModules.RockItMedia?.updateQueue(queue, currentIndex);
    }
}

export const NativeMediaBridge = new NativeMediaBridgeClass();
