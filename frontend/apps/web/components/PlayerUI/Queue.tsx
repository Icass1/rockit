import { useStore } from "@nanostores/react";
import { rockIt } from "@/lib/rockit/rockIt";

export default function PlayerUIQueue() {
    const $queue = useStore(rockIt.queueManager.queueAtom);

    return (
        <div className="flex h-full max-h-full min-h-0 w-full flex-col overflow-y-auto bg-red-400">
            {$queue.map((queueItem) => (
                <div key={queueItem.queueMediaId}>{queueItem.media.name}</div>
            ))}
        </div>
    );
}
