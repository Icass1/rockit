"use client";

import { useState } from "react";
import { useStore } from "@nanostores/react";
import { rockIt } from "@/lib/rockit/rockIt";

const SW_ACTIONS = ["GET_INFO", "UPDATE", "REGISTER", "UNREGISTER"] as const;

type SwAction = (typeof SW_ACTIONS)[number];

export default function ServiceWorkerInfo() {
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const [status, setStatus] = useState<string>($vocabulary.NO_DATA ?? "—");

    const handleAction = async (action: SwAction) => {
        if (!("serviceWorker" in navigator)) {
            setStatus(
                $vocabulary.DEVICE_DOESNT_SUPPORT_SERVICE_WORKER ??
                    "Service Worker not supported"
            );
            return;
        }

        if (action === "GET_INFO") {
            const reg = await navigator.serviceWorker.getRegistration();
            setStatus(
                reg
                    ? (reg.active?.state ?? $vocabulary.NO_STATE ?? "No state")
                    : ($vocabulary.NO_SERVICE_WORKER ?? "No service worker")
            );
            return;
        }

        const labels: Record<SwAction, string> = {
            GET_INFO: "",
            UPDATE: $vocabulary.UPDATING ?? "Updating…",
            REGISTER: $vocabulary.REGISTERING ?? "Registering…",
            UNREGISTER: $vocabulary.UNREGISTERING ?? "Unregistering…",
        };
        setStatus(labels[action]);
    };

    const buttonLabels: Record<SwAction, string> = {
        GET_INFO: $vocabulary.GET_INFO ?? "Get info",
        UPDATE: $vocabulary.UPDATE ?? "Update",
        REGISTER: $vocabulary.REGISTER ?? "Register",
        UNREGISTER: $vocabulary.UNREGISTER ?? "Unregister",
    };

    return (
        <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
                {SW_ACTIONS.map((action) => (
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
