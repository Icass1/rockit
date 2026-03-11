import { useState } from "react";
import { useStore } from "@nanostores/react";
import { rockIt } from "@/lib/rockit/rockIt";

export default function ServiceWorkerInfo() {
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const [status, setStatus] = useState<string>($vocabulary.NO_DATA);

    const handleGetInfo = async () => {
        if (!("serviceWorker" in navigator)) {
            setStatus($vocabulary.DEVICE_DOESNT_SUPPORT_SERVICE_WORKER);
            return;
        }

        const data = await navigator.serviceWorker.getRegistration();

        if (!data) {
            setStatus($vocabulary.NO_SERVICE_WORKER);
        } else {
            setStatus(data.active?.state ?? $vocabulary.NO_STATE);
        }
    };

    const handleUpdate = async () => {
        if (!("serviceWorker" in navigator)) {
            setStatus($vocabulary.DEVICE_DOESNT_SUPPORT_SERVICE_WORKER);
            return;
        }
        // if (!serviceWorkerRegistration.get()) {
        //     setStatus("No service worker registration found.");
        //     return;
        // }
        setStatus("Updating.");
        // await serviceWorkerRegistration.get()?.update();
        setStatus("Updated.");
    };

    const handleUnregister = async () => {
        if (!("serviceWorker" in navigator)) {
            setStatus($vocabulary.DEVICE_DOESNT_SUPPORT_SERVICE_WORKER);
            return;
        }

        // if (!serviceWorkerRegistration.get()) {
        //     setStatus("No service worker registration found.");
        //     return;
        // }
        setStatus($vocabulary.UNREGISTERING);
        // await serviceWorkerRegistration.get()?.unregister();
        // serviceWorkerRegistration.set(undefined);
        setStatus($vocabulary.UNREGISTERED);
    };

    const handleRegister = async () => {
        if (!("serviceWorker" in navigator)) {
            setStatus($vocabulary.DEVICE_DOESNT_SUPPORT_SERVICE_WORKER);
            return;
        }

        setStatus($vocabulary.REGISTERING);

        // const registration = await navigator.serviceWorker.register(
        //     "/service-worker.js",
        //     {
        //         scope: "/",
        //         type: "module",
        //     }
        // );
        // serviceWorkerRegistration.set(registration);
        setStatus($vocabulary.REGISTERED);
    };

    return (
        <div className="flex flex-col gap-y-1">
            <h2 className="mb-2 text-xl font-bold text-white md:text-2xl">
                Service Worker
            </h2>
            <button
                onClick={handleGetInfo}
                className="flex w-28 items-center justify-center gap-2 rounded-lg bg-[#1e1e1e] py-2 text-white shadow-md transition duration-300 active:bg-green-700 md:w-32 md:hover:bg-green-700"
            >
                {$vocabulary.GET_INFO}
            </button>
            <button
                onClick={handleUpdate}
                className="flex w-28 items-center justify-center gap-2 rounded-lg bg-[#1e1e1e] py-2 text-white shadow-md transition duration-300 active:bg-green-700 md:w-32 md:hover:bg-green-700"
            >
                {$vocabulary.UPDATE}
            </button>
            <button
                onClick={handleRegister}
                className="flex w-28 items-center justify-center gap-2 rounded-lg bg-[#1e1e1e] py-2 text-white shadow-md transition duration-300 active:bg-green-700 md:w-32 md:hover:bg-green-700"
            >
                {$vocabulary.REGISTER}
            </button>
            <button
                onClick={handleUnregister}
                className="flex w-28 items-center justify-center gap-2 rounded-lg bg-[#1e1e1e] py-2 text-white shadow-md transition duration-300 active:bg-green-700 md:w-32 md:hover:bg-green-700"
            >
                {$vocabulary.UNREGISTER}
            </button>
            <div className="gap-x-2">{status}</div>
        </div>
    );
}
