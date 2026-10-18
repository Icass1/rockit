"use client";

import {
    useCallback,
    useEffect,
    useState,
    type FormEvent,
    type JSX,
} from "react";
import { useStore } from "@nanostores/react";
import {
    recommendationLabels,
    Recommendations,
} from "@/models/types/recommendations";
import { RecommendationManager } from "@/lib/managers/recommendationManager";
import { rockIt } from "@/lib/rockit/rockIt";
import SongScrollSection from "@/components/Home/sections/SongScrollSection";

export default function RecommendationsSection(): JSX.Element {
    const account = useStore(rockIt.userManager.usernameAtom);
    const current = useStore(rockIt.queueManager.currentMediaAtom);
    const vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const [configuredAccount, setConfiguredAccount] = useState("");
    const [username, setUsername] = useState<string | null>(null);
    const [draft, setDraft] = useState("");
    const [data, setData] = useState<Recommendations>();
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [offline, setOffline] = useState(false);
    const [revision, setRevision] = useState(0);
    const label = (key: keyof typeof recommendationLabels): string => {
        const value = (vocabulary as unknown as Record<string, string>)[key];
        return value && value !== key ? value : recommendationLabels[key];
    };

    useEffect(() => {
        if (!account) return;
        const saved = RecommendationManager.username(account);
        setConfiguredAccount(account);
        setUsername(saved);
        setDraft(saved);
        setData(undefined);
    }, [account]);

    const load = useCallback(
        async (signal: AbortSignal): Promise<void> => {
            if (username === null || !account || configuredAccount !== account)
                return;
            setLoading(true);
            setFailed(false);
            try {
                const result = await RecommendationManager.loadAsync(
                    account,
                    username,
                    rockIt.queueManager.currentMediaAtom.get()?.publicId,
                    signal,
                    (local) => {
                        if (!signal.aborted) {
                            setData(local);
                            setOffline(false);
                        }
                    }
                );
                if (!signal.aborted) {
                    setData(result.data);
                    setOffline(result.offline);
                }
            } catch {
                if (!signal.aborted) setFailed(true);
            } finally {
                if (!signal.aborted) setLoading(false);
            }
        },
        [account, configuredAccount, username]
    );

    useEffect(() => {
        const controller = new AbortController();
        void load(controller.signal);
        return (): void => controller.abort();
    }, [load, revision]);

    function enable(event: FormEvent): void {
        event.preventDefault();
        const value = draft.trim();
        RecommendationManager.setUsername(account, value);
        setUsername(value);
        setRevision((value) => value + 1);
    }

    const songs =
        configuredAccount === account
            ? (data?.songs.filter(
                  (song) => song.publicId !== current?.publicId
              ) ?? [])
            : [];
    const statusKey =
        data?.externalStatus === "active"
            ? "RECOMMENDATIONS_ACTIVE"
            : data?.externalStatus === "disabled"
              ? "RECOMMENDATIONS_DISABLED"
              : data?.externalStatus === "unavailable"
                ? "RECOMMENDATIONS_UNAVAILABLE"
                : data?.externalStatus === "no_matches"
                  ? "RECOMMENDATIONS_NO_MATCHES"
                  : "RECOMMENDATIONS_LOCAL";

    return (
        <section
            className="py-6"
            aria-label={vocabulary.SONGS_FOR_YOU}
            aria-busy={loading}
        >
            <div className="px-5 md:px-12">
                <div className="flex items-center justify-between gap-4">
                    <h2 className="text-2xl font-bold text-white">
                        {vocabulary.SONGS_FOR_YOU}
                    </h2>
                    <button
                        type="button"
                        disabled={loading}
                        onClick={(): void => setRevision((value) => value + 1)}
                        className="rounded-lg border border-white/20 px-3 py-2 text-sm text-white disabled:opacity-50"
                    >
                        {label("RECOMMENDATIONS_REFRESH")}
                    </button>
                </div>
                <p className="mt-2 text-sm text-neutral-400" role="status">
                    {offline
                        ? label("RECOMMENDATIONS_OFFLINE")
                        : label(statusKey)}
                </p>
                {loading && !data && (
                    <p className="skeleton mt-4 rounded-lg p-4 text-neutral-400">
                        {label("RECOMMENDATIONS_LOADING")}
                    </p>
                )}
                {failed && (
                    <p className="mt-4 text-sm text-neutral-400" role="alert">
                        {label("RECOMMENDATIONS_ERROR")}
                    </p>
                )}
                {!loading && !failed && songs.length === 0 && (
                    <p className="mt-4 text-neutral-400">
                        {label("RECOMMENDATIONS_EMPTY")}
                    </p>
                )}
                <details className="mt-4 text-sm text-neutral-400">
                    <summary className="cursor-pointer">ListenBrainz</summary>
                    <p className="my-3 max-w-2xl">
                        {label("RECOMMENDATIONS_EXTERNAL_HELP")}
                    </p>
                    <form
                        onSubmit={enable}
                        className="flex flex-wrap items-end gap-3"
                    >
                        <div>
                            <label
                                htmlFor="recommendation-username"
                                className="mb-1 block"
                            >
                                {label("RECOMMENDATIONS_USERNAME")}
                            </label>
                            <input
                                id="recommendation-username"
                                value={draft}
                                onChange={(event): void =>
                                    setDraft(event.target.value)
                                }
                                maxLength={64}
                                required
                                autoComplete="off"
                                className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading || !draft.trim()}
                            className="rounded-lg bg-white/10 px-3 py-2 text-white disabled:opacity-50"
                        >
                            {label("RECOMMENDATIONS_ENABLE")}
                        </button>
                        {username && (
                            <button
                                type="button"
                                onClick={(): void => {
                                    RecommendationManager.setUsername(
                                        account,
                                        ""
                                    );
                                    setUsername("");
                                    setDraft("");
                                }}
                                className="rounded-lg border border-white/20 px-3 py-2 text-white"
                            >
                                {label("RECOMMENDATIONS_DISABLE")}
                            </button>
                        )}
                    </form>
                </details>
            </div>
            {songs.length > 0 && <SongScrollSection title="" songs={songs} />}
        </section>
    );
}
