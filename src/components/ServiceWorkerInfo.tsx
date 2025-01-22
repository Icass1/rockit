import { useState } from "react";

export default function ServiceWorkerInfo() {
    const [status, setStatus] = useState<string>("No data");

    const handleClick = async () => {
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

    return (
        <div>
            <h2 className="text-xl md:text-2xl font-bold text-white mb-2">
                Service Worker
            </h2>
            <button
                onClick={handleClick}
                className="w-28 md:w-32 py-2 bg-[#1e1e1e] text-white rounded-lg shadow-md active:bg-green-700 md:hover:bg-green-700 transition duration-300 flex items-center justify-center gap-2"
            >
                Update
            </button>

            <div className="gap-x-2">{status}</div>
        </div>
    );
}
