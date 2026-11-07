"use client";

import { JSX, useState } from "react";
import { EServiceWorkerAction } from "@/models/enums/serviceWorkerAction";
import { useVocabulary } from "@/components/providers/VocabularyProvider";

export default function ServiceWorkerInfo(): JSX.Element {
    const $vocabulary = useVocabulary();
    const [status, setStatus] = useState<string>($vocabulary.NO_DATA);

    const handleAction = async (
        action: EServiceWorkerAction
    ): Promise<void> => {
        if (!("serviceWorker" in navigator)) {
            setStatus($vocabulary.DEVICE_DOESNT_SUPPORT_SERVICE_WORKER);
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
                    .map((action): JSX.Element => (
                        <button
                            key={action}
                            type="button"
                            onClick={(): Promise<void> => handleAction(action)}
                            className="bg-muted text-foreground-strong hover:bg-accent active:bg-success-hover rounded-xl px-3 py-2 text-xs font-semibold transition-colors"
                        >
                            {buttonLabels[action]}
                        </button>
                    ))}
            </div>
            {status && (
                <p className="text-subtle-foreground text-xs">{status}</p>
            )}
        </div>
    );
}
