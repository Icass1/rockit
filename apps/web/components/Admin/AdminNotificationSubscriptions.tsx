"use client";

import { useEffect, useState, type JSX } from "react";
import type {
    NotificationEventResponse,
    NotificationSubscriptionsResponse,
    NotificationUserResponse,
} from "@/dto";
import { useStore } from "@nanostores/react";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";

export default function AdminNotificationSubscriptions(): JSX.Element {
    const vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const [users, setUsers] = useState<NotificationUserResponse[]>([]);
    const [events, setEvents] = useState<NotificationEventResponse[]>([]);
    const [user, setUser] = useState("");
    const [selected, setSelected] = useState<
        NotificationSubscriptionsResponse["eventKeys"]
    >([]);
    const [ready, setReady] = useState(false);
    const [message, setMessage] = useState("");
    useEffect(() => {
        let active = true;
        void Promise.all([Http.notificationUsers(), Http.events()])
            .then(([people, registered]) => {
                if (!active) return;
                if (people.isOk() && registered.isOk()) {
                    setUsers(people.result.users);
                    setEvents(registered.result.events);
                } else setMessage(vocabulary.NOTIFICATION_LOAD_FAILED);
            })
            .catch(() => {
                if (active) setMessage(vocabulary.NOTIFICATION_LOAD_FAILED);
            });
        return (): void => {
            active = false;
        };
    }, [vocabulary]);
    useEffect(() => {
        let active = true;
        if (!user) return;
        void Http.subscriptions(user)
            .then((result) => {
                if (!active) return;
                if (result.isOk()) {
                    setSelected(result.result.eventKeys);
                    setReady(true);
                } else setMessage(result.message);
            })
            .catch(() => {
                if (active) setMessage(vocabulary.NOTIFICATION_LOAD_FAILED);
            });
        return (): void => {
            active = false;
        };
    }, [user, vocabulary]);
    const save = async (): Promise<void> => {
        setReady(false);
        try {
            const result = await Http.updateSubscriptions(user, {
                eventKeys: selected,
            });
            setMessage(
                result.isOk() ? vocabulary.NOTIFICATION_SAVED : result.message
            );
        } catch {
            setMessage(vocabulary.NOTIFICATION_LOAD_FAILED);
        } finally {
            setReady(true);
        }
    };
    return (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5 text-white">
            <h2 className="mb-4 font-semibold">
                {vocabulary.NOTIFICATION_SUBSCRIPTIONS}
            </h2>
            <label htmlFor="notification-user">
                {vocabulary.NOTIFICATION_SELECT_USER}
            </label>
            <select
                id="notification-user"
                value={user}
                onChange={(event): void => {
                    setReady(false);
                    setSelected([]);
                    setMessage("");
                    setUser(event.target.value);
                }}
                className="my-3 block w-full rounded bg-neutral-800 p-2"
            >
                <option value="">{vocabulary.NOTIFICATION_SELECT_USER}</option>
                {users.map((person) => (
                    <option key={person.publicId} value={person.publicId}>
                        {person.username}
                    </option>
                ))}
            </select>
            {user &&
                events.map((event) => (
                    <label
                        key={event.key}
                        htmlFor={`notification-${event.key}`}
                        className="my-3 flex items-center gap-3"
                    >
                        <input
                            id={`notification-${event.key}`}
                            type="checkbox"
                            disabled={!ready}
                            checked={selected.includes(event.key)}
                            onChange={(change): void =>
                                setSelected((current) =>
                                    change.target.checked
                                        ? [...current, event.key]
                                        : current.filter(
                                              (key) => key !== event.key
                                          )
                                )
                            }
                        />
                        {Object.entries(vocabulary).find(
                            ([key]) => key === event.vocabularyKey
                        )?.[1] ?? event.vocabularyKey}
                    </label>
                ))}
            <button
                type="button"
                disabled={!user || !ready}
                onClick={(): void => {
                    void save();
                }}
                className="mt-3 rounded bg-neutral-700 px-4 py-2 disabled:opacity-40"
            >
                {vocabulary.NOTIFICATION_SAVE}
            </button>
            {message && (
                <p role="status" className="mt-3 text-sm">
                    {message}
                </p>
            )}
        </div>
    );
}
