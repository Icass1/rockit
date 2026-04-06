"use client";

import { useState } from "react";
import { useStore } from "@nanostores/react";
import { EPlaylistAction as EServiceWorkerAction } from "@/models/enums/serviceWorkerAction";
import { rockIt } from "@/lib/rockit/rockIt";

export default function ServiceWorkerInfo() {
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const [status, setStatus] = useState<string>($vocabulary.NO_DATA ?? "—");

    const handleAction = async (action: EServiceWorkerAction) => {
        if (!("serviceWorker" in navigator)) {
            setStatus(
                $vocabulary.DEVICE_DOESNT_SUPPORT_SERVICE_WORKER ??
                    "Service Worker not supported"
            );
            return;
        }

        if (action === EServiceWorkerAction.GET_INFO) {
            const reg = await navigator.serviceWorker.getRegistration();
            setStatus(
                reg
                    ? (reg.active?.state ?? $vocabulary.NO_STATE)
                    : $vocabulary.NO_SERVICE_WORKER
            );
            return;
        }

        const labels: Record<EServiceWorkerAction, string> = {
            [EServiceWorkerAction.GET_INFO]: $vocabulary.GETTING_INFO,
            [EServiceWorkerAction.UPDATE]: $vocabulary.UPDATING,
            [EServiceWorkerAction.REGISTER]: $vocabulary.REGISTERING,
            [EServiceWorkerAction.UNREGISTER]: $vocabulary.UNREGISTERING,
        };
        setStatus(labels[action]);
    };

    const buttonLabels: Record<EServiceWorkerAction, string> = {
        [EServiceWorkerAction.GET_INFO]: $vocabulary.GET_INFO,
        [EServiceWorkerAction.UPDATE]: $vocabulary.UPDATE,
        [EServiceWorkerAction.REGISTER]: $vocabulary.REGISTER,
        [EServiceWorkerAction.UNREGISTER]: $vocabulary.UNREGISTER,
    };

    return (
        <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
                {Object.values(EServiceWorkerAction)
                    .filter(
                        (v): v is EServiceWorkerAction => typeof v === "number"
                    )
                    .map((action) => (
                        <button
                            key={action}
                            type="button"
                            onClick={() => handleAction(action)}
                            className="rounded-xl bg-neutral-800 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-neutral-700 active:bg-green-700"
                        >
                            {buttonLabels[action]}
                        </button>
                    ))}
            </div>
            {status && <p className="text-xs text-neutral-500">{status}</p>}
        </div>
    );
}
