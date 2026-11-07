import { type JSX } from "react";
import { Download } from "lucide-react";

export default function DownloadEmptyState(): JSX.Element {
    return (
        <div className="border-border-strong flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-16 text-center">
            <Download size={32} className="text-disabled-foreground" />
            <p className="text-muted-foreground">
                Todavía no has descargado nada.
            </p>
            <p className="text-subtle-foreground text-sm">
                Pega un enlace de Spotify o YouTube arriba para empezar.
            </p>
        </div>
    );
}
