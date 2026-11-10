import { PlaybackLifecycle } from "@rockit/platform-browser/runtime/playbackLifecycle";
import { rockIt } from "@/lib/rockit/rockIt";

export class LockScreenManager {
    private lifecycle?: PlaybackLifecycle;

    init(): void {
        this.lifecycle ??= new PlaybackLifecycle(rockIt);
        this.lifecycle.start();
    }

    destroy(): void {
        this.lifecycle?.stop();
    }
}
