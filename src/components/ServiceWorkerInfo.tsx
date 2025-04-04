import { serviceWorkerRegistration } from "@/stores/audio";
import { langData } from "@/stores/lang";
import { useStore } from "@nanostores/react";
import { useState } from "react";

export default function ServiceWorkerInfo() {
    const [status, setStatus] = useState<string>("No data");

    const handleGetInfo = async () => {
        if (!("serviceWorker" in navigator)) {
            setStatus("Your device doesn't support service worker");
            return;
        }

        const data = await navigator.serviceWorker.getRegistration();

        if (!data) {
            setStatus("No service worker.");
        } else {
            setStatus(data.active?.state ?? "No state");
        }
    };

    const handleUpdate = async () => {
        if (!("serviceWorker" in navigator)) {
            setStatus("Your device doesn't support service worker");
            return;
        }
        if (!serviceWorkerRegistration.get()) {
            setStatus("No service worker registration found.");
            return;
        }
        setStatus("Updating.");
        serviceWorkerRegistration.get()?.update();
        setStatus("Updated.");
    };

    const handleUnregister = async () => {
        if (!("serviceWorker" in navigator)) {
            setStatus("Your device doesn't support service worker");
            return;
        }

        if (!serviceWorkerRegistration.get()) {
            setStatus("No service worker registration found.");
            return;
        }
        setStatus("Unregistering.");
        serviceWorkerRegistration.get()?.unregister();
        setStatus("Unregistered.");
    };

    const $lang = useStore(langData);
    if (!$lang) return;

    return (
        <div className="flex flex-col gap-y-1">
            <h2 className="text-xl md:text-2xl font-bold text-white mb-2">
                Service Worker
            </h2>
            <button
                onClick={handleGetInfo}
                className="w-28 md:w-32 py-2 bg-[#1e1e1e] text-white rounded-lg shadow-md active:bg-green-700 md:hover:bg-green-700 transition duration-300 flex items-center justify-center gap-2"
            >
                {$lang.get_info}
            </button>
            <button
                onClick={handleUpdate}
                className="w-28 md:w-32 py-2 bg-[#1e1e1e] text-white rounded-lg shadow-md active:bg-green-700 md:hover:bg-green-700 transition duration-300 flex items-center justify-center gap-2"
            >
                {$lang.update}
            </button>
            <button
                onClick={handleUnregister}
                className="w-28 md:w-32 py-2 bg-[#1e1e1e] text-white rounded-lg shadow-md active:bg-green-700 md:hover:bg-green-700 transition duration-300 flex items-center justify-center gap-2"
            >
                {"Unregister"}
            </button>
            <div className="gap-x-2">{status}</div>
        </div>
    );
}
