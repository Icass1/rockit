"use client";

import { useEffect, useState, type JSX } from "react";
import type { BaseSearchResultsItem } from "@/dto";
import { useStore } from "@nanostores/react";
import { Check, Download, LoaderCircle } from "lucide-react";
import { rockIt } from "@/lib/rockit/rockIt";
import {
    downloadArtistSource,
    findArtistSources,
} from "@/lib/services/artistSourceService";

export default function ArtistSources({
    artist,
    title,
    type,
}: {
    artist: string;
    title: string;
    type: "album" | "song";
}): JSX.Element {
    const v = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const [sources, setSources] = useState<BaseSearchResultsItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [attempt, setAttempt] = useState(0);
    const [busy, setBusy] = useState("");
    const [started, setStarted] = useState<string[]>([]);
    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        setFailed(false);
        void findArtistSources(artist, title, type, controller.signal)
            .then((result) => {
                if (controller.signal.aborted) return;
                setSources(result.items);
                setFailed(result.partial);
            })
            .catch(() => {
                if (!controller.signal.aborted) setFailed(true);
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });
        return () => controller.abort();
    }, [artist, title, type, attempt]);
    async function download(source: BaseSearchResultsItem): Promise<void> {
        if (busy) return;
        setBusy(source.providerUrl);
        try {
            await downloadArtistSource(source);
            setStarted((current) => [...current, source.providerUrl]);
        } catch {
            rockIt.notificationManager.notifyError(v.ERROR_STARTING_DOWNLOAD);
        } finally {
            setBusy("");
        }
    }
    return (
        <div className="artist-sources" aria-live="polite" aria-busy={loading}>
            {loading && (
                <p className="artist-notice">
                    <LoaderCircle
                        size={16}
                        className="animate-spin"
                        aria-hidden
                    />{" "}
                    {v.ARTIST_METADATA_LOADING}
                </p>
            )}
            {sources.length > 0 && (
                <p className="artist-catalog-caption">
                    {v.ARTIST_SOURCE_CHOOSER}
                </p>
            )}
            {sources.map((source) => (
                <button
                    key={source.providerUrl}
                    className="artist-source"
                    disabled={
                        Boolean(busy) || started.includes(source.providerUrl)
                    }
                    onClick={() => void download(source)}
                    aria-label={`${v.DOWNLOAD}: ${source.name} · ${source.provider}`}
                >
                    <span>
                        <strong>{source.name}</strong>
                        <small>
                            {source.artists
                                .map((entry) => entry.name)
                                .join(", ")}{" "}
                            · {source.provider}
                        </small>
                    </span>
                    {busy === source.providerUrl ? (
                        <LoaderCircle
                            size={18}
                            className="animate-spin"
                            aria-hidden
                        />
                    ) : started.includes(source.providerUrl) ? (
                        <Check size={18} aria-hidden />
                    ) : (
                        <Download size={18} aria-hidden />
                    )}
                </button>
            ))}
            {!loading && !failed && !sources.length && (
                <p className="artist-empty">{v.NO_RESULTS}</p>
            )}
            {!loading && failed && (
                <p role="status" className="artist-notice">
                    {v.ERROR_SEARCHING}{" "}
                    <button
                        className="artist-text-action"
                        onClick={() => setAttempt(attempt + 1)}
                    >
                        {v.RETRY}
                    </button>
                </p>
            )}
        </div>
    );
}
