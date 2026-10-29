"use client";

import { JSX, useEffect, useState } from "react";
import { useStore } from "@nanostores/react";
import type {
    NotificationEventKey,
    NotificationEventResponse,
} from "@rockit/shared";
import { Http } from "@/lib/http";
import { notificationVocabularyText } from "@/lib/notifications";
import { rockIt } from "@/lib/rockit/rockIt";

export default function NotificationSettings(): JSX.Element {
    const vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const [events, setEvents] = useState<NotificationEventResponse[]>([]);
    const [eventKeys, setEventKeys] = useState<NotificationEventKey[]>([]);
    const [savedEventKeys, setSavedEventKeys] = useState<
        NotificationEventKey[]
    >([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect((): (() => void) => {
        let active = true;

        async function loadSettings(): Promise<void> {
            try {
                const [availableEvents, subscriptions] = await Promise.all([
                    Http.getNotificationEvents(),
                    Http.getNotificationSubscriptions(),
                ]);
                if (!active) return;

                if (!availableEvents.isOk() || !subscriptions.isOk()) {
                    setError(true);
                    setLoading(false);
                    return;
                }

                setEvents(availableEvents.result);
                setEventKeys(subscriptions.result.eventKeys);
                setSavedEventKeys(subscriptions.result.eventKeys);
                setLoading(false);
            } catch {
                if (!active) return;
                setError(true);
                setLoading(false);
            }
        }

        void loadSettings();
        return (): void => {
            active = false;
        };
    }, []);

    const toggleEvent = (key: NotificationEventKey, enabled: boolean): void => {
        setSaved(false);
        setError(false);
        setEventKeys((current) =>
            enabled
                ? [...current, key]
                : current.filter((eventKey) => eventKey !== key)
        );
    };

    const save = async (): Promise<void> => {
        setSaving(true);
        setError(false);
        setSaved(false);
        try {
            const result = await Http.setNotificationSubscriptions({
                eventKeys,
            });
            if (!result.isOk()) {
                setError(true);
                return;
            }
            setEventKeys(result.result.eventKeys);
            setSavedEventKeys(result.result.eventKeys);
            setSaved(true);
        } catch {
            setError(true);
        } finally {
            setSaving(false);
        }
    };

    const hasChanges =
        eventKeys.length !== savedEventKeys.length ||
        eventKeys.some((key) => !savedEventKeys.includes(key));

    return (
        <div className="flex flex-col gap-4">
            <p className="text-sm text-neutral-400">
                {vocabulary.NOTIFICATIONS_SUBSCRIPTIONS_HINT}
            </p>

            {loading ? (
                <p className="text-sm text-neutral-500">Loading...</p>
            ) : (
                <div className="divide-y divide-neutral-800 rounded-xl border border-neutral-800">
                    {events.map((event) => (
                        <label
                            key={event.key}
                            htmlFor={`notification-${event.key}`}
                            className="flex cursor-pointer items-center justify-between gap-4 px-4 py-3"
                        >
                            <span className="text-sm text-neutral-200">
                                {notificationVocabularyText(
                                    vocabulary,
                                    event.vocabularyKey
                                )}
                            </span>
                            <input
                                id={`notification-${event.key}`}
                                type="checkbox"
                                checked={eventKeys.includes(event.key)}
                                disabled={saving}
                                onChange={(input) =>
                                    toggleEvent(
                                        event.key,
                                        input.currentTarget.checked
                                    )
                                }
                                className="h-4 w-4 accent-(--color-rockit-pink)"
                            />
                        </label>
                    ))}
                </div>
            )}

            {error && (
                <p role="alert" className="text-sm text-red-400">
                    {vocabulary.NOTIFICATIONS_LOAD_FAILED}
                </p>
            )}
            {saved && (
                <p role="status" className="text-sm text-green-400">
                    {vocabulary.NOTIFICATIONS_SAVED}
                </p>
            )}

            <div className="flex justify-end">
                <button
                    type="button"
                    disabled={loading || saving || !hasChanges}
                    onClick={() => void save()}
                    className="rounded-xl bg-(--color-rockit-pink) px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-(--color-rockit-pink-mid) disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {saving ? "Saving..." : vocabulary.NOTIFICATIONS_SAVE}
                </button>
            </div>
        </div>
    );
}
