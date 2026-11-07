import { type JSX } from "react";
import { Download } from "lucide-react";
import { useVocabulary } from "@/components/providers/VocabularyProvider";

export default function DownloadEmptyState(): JSX.Element {
    const vocabulary = useVocabulary();

    return (
        <div className="border-border-strong flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-16 text-center">
            <Download size={32} className="text-disabled-foreground" />
            <p className="text-muted-foreground">{vocabulary.NO_DOWNLOADS}</p>
            <p className="text-subtle-foreground text-sm">
                {vocabulary.MOBILE_DOWNLOAD_HINT}
            </p>
        </div>
    );
}
