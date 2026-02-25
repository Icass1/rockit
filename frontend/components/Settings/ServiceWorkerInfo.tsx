import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

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
            setStatus("Your device doesn't support service worker");
            return;
        }

        // if (!serviceWorkerRegistration.get()) {
        //     setStatus("No service worker registration found.");
        //     return;
        // }
        setStatus("Unregistering.");
        // await serviceWorkerRegistration.get()?.unregister();
        // serviceWorkerRegistration.set(undefined);
        setStatus("Unregistered.");
    };

    const handleRegister = async () => {
        if (!("serviceWorker" in navigator)) {
            setStatus("Your device doesn't support service worker");
            return;
        }

        setStatus("Registering.");

        // const registration = await navigator.serviceWorker.register(
        //     "/service-worker.js",
        //     {
        //         scope: "/",
        //         type: "module",
        //     }
        // );
        // serviceWorkerRegistration.set(registration);
        setStatus("Registering.");
    };

    const { langFile: lang } = useLanguage();
    if (!lang) return false;

    return (
        <div className="flex flex-col gap-y-1">
            <h2 className="mb-2 text-xl font-bold text-white md:text-2xl">
                Service Worker
            </h2>
            <button
                onClick={handleGetInfo}
                className="flex w-28 items-center justify-center gap-2 rounded-lg bg-[#1e1e1e] py-2 text-white shadow-md transition duration-300 active:bg-green-700 md:w-32 md:hover:bg-green-700"
            >
                {lang.get_info}
            </button>
            <button
                onClick={handleUpdate}
                className="flex w-28 items-center justify-center gap-2 rounded-lg bg-[#1e1e1e] py-2 text-white shadow-md transition duration-300 active:bg-green-700 md:w-32 md:hover:bg-green-700"
            >
                {lang.update}
            </button>
            <button
                onClick={handleRegister}
                className="flex w-28 items-center justify-center gap-2 rounded-lg bg-[#1e1e1e] py-2 text-white shadow-md transition duration-300 active:bg-green-700 md:w-32 md:hover:bg-green-700"
            >
                {"Register"}
            </button>
            <button
                onClick={handleUnregister}
                className="flex w-28 items-center justify-center gap-2 rounded-lg bg-[#1e1e1e] py-2 text-white shadow-md transition duration-300 active:bg-green-700 md:w-32 md:hover:bg-green-700"
            >
                {"Unregister"}
            </button>
            <div className="gap-x-2">{status}</div>
        </div>
    );
}
