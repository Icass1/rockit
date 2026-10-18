"use client";

import { useState, type JSX } from "react";
import type { RecommendationSettingsResponse } from "@/dto";
import { useStore } from "@nanostores/react";
import useFetch from "@/hooks/useFetch";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";

/** Opt-in for external discovery suggestions. Local recommendations need no
 * setup and keep working whatever is chosen here. */
export default function RecommendationSettings(): JSX.Element {
    const { data } = useFetch(Http.getRecommendationSettings);

    if (!data) return <div className="skeleton h-40 w-full rounded-xl" />;

    return <RecommendationSettingsForm initial={data} />;
}

function RecommendationSettingsForm({
    initial,
}: {
    initial: RecommendationSettingsResponse;
}): JSX.Element {
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);

    const [externalEnabled, setExternalEnabled] = useState(
        initial.externalEnabled
    );
    const [username, setUsername] = useState(
        initial.listenbrainzUsername ?? ""
    );
    const [saving, setSaving] = useState(false);

    const providers = initial.availableProviders;
    const disabled = saving;

    const handleSave = async (): Promise<void> => {
        setSaving(true);
        const saved = await rockIt.userManager.setRecommendationSettingsAsync({
            externalEnabled,
            listenbrainzUsername: username.trim() || null,
        });
        setSaving(false);
        if (saved) {
            setExternalEnabled(saved.externalEnabled);
            setUsername(saved.listenbrainzUsername ?? "");
        }
    };

    return (
        <div className="flex flex-col gap-3">
            <p className="text-xs text-neutral-500">
                {$vocabulary.RECOMMENDATIONS_EXTERNAL_HELP}
            </p>

            <div className="flex items-center gap-3">
                <input
                    id="recommendations-external-enabled"
                    type="checkbox"
                    checked={externalEnabled}
                    disabled={disabled}
                    onChange={(e): void =>
                        setExternalEnabled(e.currentTarget.checked)
                    }
                    className="h-4 w-4 accent-(--color-rockit-pink)"
                />
                <label
                    htmlFor="recommendations-external-enabled"
                    className="text-sm font-medium text-neutral-300"
                >
                    {$vocabulary.RECOMMENDATIONS_EXTERNAL_ENABLE}
                </label>
            </div>

            <div className="flex flex-col gap-1.5">
                <label
                    htmlFor="listenbrainz-username"
                    className="text-sm font-medium text-neutral-400"
                >
                    {$vocabulary.LISTENBRAINZ_USERNAME}
                </label>
                <input
                    id="listenbrainz-username"
                    type="text"
                    autoComplete="off"
                    spellCheck={false}
                    maxLength={64}
                    value={username}
                    disabled={disabled || !externalEnabled}
                    onChange={(e): void => setUsername(e.currentTarget.value)}
                    className="w-full rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-2.5 text-sm text-white transition-colors focus:border-(--color-rockit-pink) focus:ring-1 focus:ring-(--color-rockit-pink) focus:outline-none disabled:opacity-50"
                />
                <p className="text-xs text-neutral-500">
                    {$vocabulary.LISTENBRAINZ_USERNAME_HELP}
                </p>
            </div>

            <p className="text-xs text-neutral-500">
                {providers.length > 0
                    ? `${$vocabulary.RECOMMENDATIONS_AVAILABLE_PROVIDERS}: ${providers.join(", ")}`
                    : $vocabulary.RECOMMENDATIONS_NO_PROVIDERS}
            </p>

            <button
                type="button"
                onClick={handleSave}
                disabled={disabled}
                className="self-start rounded-xl bg-neutral-800 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-neutral-700 disabled:opacity-50"
            >
                {saving ? $vocabulary.SAVING : $vocabulary.SAVE}
            </button>
        </div>
    );
}
