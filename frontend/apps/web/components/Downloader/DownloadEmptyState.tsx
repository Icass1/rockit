import { type JSX } from "react";
import { Download } from "lucide-react";

export default function DownloadEmptyState(): JSX.Element {
    return (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-neutral-600 py-16 text-center">
            <Download size={32} className="text-neutral-600" />
            <p className="text-neutral-400">Todavía no has descargado nada.</p>
            <p className="text-sm text-neutral-500">
                Pega un enlace de Spotify o YouTube arriba para empezar.
            </p>
        </div>
    );
}
