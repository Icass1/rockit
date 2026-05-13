import { useStore } from "@nanostores/react";
import { rockIt } from "@/lib/rockit/rockIt";

export default function PlayerUIQueue() {
    const $queue = useStore(rockIt.queueManager.queueAtom);
    const $currentQueueMediaId = useStore(
        rockIt.queueManager.currentQueueMediaIdAtom
    );

    return (
        <div className="flex h-full max-h-full min-h-0 w-full max-w-full min-w-0 flex-col overflow-y-auto">
            {$queue.map((queueItem) => (
                <div
                    key={queueItem.queueMediaId}
                    className={`w-full max-w-full min-w-0 ${$currentQueueMediaId == queueItem.queueMediaId && "bg-red-500"}`}
                >
                    <label className="text-nowrap text-ellipsis">
                        {queueItem.media.name}
                    </label>
                </div>
            ))}
        </div>
    );
}
