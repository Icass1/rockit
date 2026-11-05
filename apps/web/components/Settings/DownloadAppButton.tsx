"use client";

import { JSX, useEffect, useState } from "react";
import { useStore } from "@nanostores/react";
import { CloudOff, Wifi } from "lucide-react";
import { networkStatus } from "@/lib/stores/networkStatus";
import { useVocabulary } from "@/components/providers/VocabularyProvider";

export default function DownloadAppButton(): JSX.Element {
    const $vocabulary = useVocabulary();
    const $network = useStore(networkStatus);
    const [swReady, setSwReady] = useState(false);

    useEffect(() => {
        if (typeof navigator === "undefined" || !navigator.serviceWorker)
            return;
        navigator.serviceWorker.ready.then((): void => setSwReady(true));
    }, []);

    return (
        <div className="flex flex-col gap-2">
            <div className="bg-muted text-foreground-strong flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold">
                {$network === "online" ? (
                    <Wifi className="text-success-foreground h-4 w-4" />
                ) : (
                    <CloudOff className="text-muted-foreground h-4 w-4" />
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
