import { JSX } from "react";

export default function OfflinePage(): JSX.Element {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white">
            <h1 className="mb-2 text-2xl font-bold">Sin conexión</h1>
            <p className="text-neutral-400">
                Reproduce tu música descargada sin conexión a internet.
            </p>
        </div>
    );
}
