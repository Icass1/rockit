"use client";

import { JSX, useEffect, useState } from "react";
import { useStore } from "@nanostores/react";
import { CloudOff, Wifi } from "lucide-react";
import { rockIt } from "@/lib/rockit/rockIt";
import { networkStatus } from "@/lib/stores/networkStatus";

export default function DownloadAppButton(): JSX.Element {
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const $network = useStore(networkStatus);
    const [swReady, setSwReady] = useState(false);

    useEffect(() => {
        if (typeof navigator === "undefined" || !navigator.serviceWorker) return;
        navigator.serviceWorker.ready.then((): void => setSwReady(true));
    }, []);

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 rounded-xl bg-neutral-800 px-4 py-2.5 text-sm font-semibold text-white">
                {$network === "online" ? (
                    <Wifi className="h-4 w-4 text-green-400" />
                ) : (
                    <CloudOff className="h-4 w-4 text-neutral-400" />
                )}
                <span>
                    {swReady
                        ? $vocabulary.APP_AVAILABLE_OFFLINE
                        : $vocabulary.APP_OFFLINE_UNAVAILABLE}
                </span>
            </div>
        </div>
    );
}
