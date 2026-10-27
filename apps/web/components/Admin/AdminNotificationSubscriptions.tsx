"use client";

import { useEffect, useState, type JSX } from "react";
import { useStore } from "@nanostores/react";
import type { NotificationEventKey, NotificationEventResponse, NotificationUserResponse } from "@rockit/shared";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";
import { notificationVocabularyText } from "@/lib/notifications";

export default function AdminNotificationSubscriptions(): JSX.Element {
    const vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const [users, setUsers] = useState<NotificationUserResponse[]>([]);
    const [events, setEvents] = useState<NotificationEventResponse[]>([]);
    const [userId, setUserId] = useState("");
    const [keys, setKeys] = useState<NotificationEventKey[]>([]);
    const [busy, setBusy] = useState(true);
    const [error, setError] = useState(false);
    const [saved, setSaved] = useState(false);
    useEffect(() => {
        let active = true;
        void Promise.all([Http.listNotificationUsers(), Http.listNotificationEvents()]).then(([accounts, registered]) => {
            if (!active) return;
            if (accounts.isNotOk() || registered.isNotOk()) { setError(true); setBusy(false); return; }
            setUsers(accounts.result); setEvents(registered.result); setBusy(false);
        }).catch(() => { if (active) { setError(true); setBusy(false); } });
        return () => { active = false; };
    }, []);
    useEffect(() => {
        if (!userId) return;
        let active = true;
        void Http.getNotificationSubscriptions(userId).then((result) => {
            if (!active) return;
            setBusy(false);
            if (result.isNotOk()) { setError(true); return; }
            setKeys(result.result.eventKeys);
        }).catch(() => { if (active) { setError(true); setBusy(false); } });
        return () => { active = false; };
    }, [userId]);
    async function save(): Promise<void> {
        const selectedUser = userId; setBusy(true); setSaved(false); setError(false);
        try {
            const result = await Http.setNotificationSubscriptions(selectedUser, { eventKeys: keys });
            if (result.isNotOk()) { setError(true); return; }
            setKeys(result.result.eventKeys); setSaved(true);
        } catch { setError(true); } finally { setBusy(false); }
    }
    return <section className="rounded-xl border border-neutral-800 p-5">
        <h2 className="text-lg font-semibold">{vocabulary.NOTIFICATIONS_SUBSCRIPTIONS}</h2>
        <p className="my-3 text-sm text-neutral-400">{vocabulary.NOTIFICATIONS_SUBSCRIPTIONS_HINT}</p>
        <label className="block text-sm">{vocabulary.NOTIFICATIONS_SELECT_USER}
            <select value={userId} disabled={busy} className="my-2 block w-full rounded-lg bg-neutral-900 p-3" onChange={(event) => {
                setUserId(event.target.value); setKeys([]); setSaved(false); setError(false); setBusy(!!event.target.value);
            }}>
                <option value="">{vocabulary.NOTIFICATIONS_SELECT_USER}</option>
                {users.map((user) => <option key={user.publicId} value={user.publicId}>{user.username}</option>)}
            </select>
        </label>
        {userId && events.map((event) => <label key={event.key} className="my-3 flex items-center gap-3">
            <input type="checkbox" checked={keys.includes(event.key)} disabled={busy} onChange={(input) => {
                setSaved(false); setKeys(input.target.checked ? [...keys, event.key] : keys.filter((key) => key !== event.key));
            }} />{notificationVocabularyText(vocabulary, event.vocabularyKey)}
        </label>)}
        {error && <p role="alert" className="my-3 text-red-400">{vocabulary.NOTIFICATIONS_LOAD_FAILED}</p>}
        {saved && <p role="status" className="my-3 text-green-400">{vocabulary.NOTIFICATIONS_SAVED}</p>}
        <button disabled={!userId || busy} onClick={() => void save()} className="mt-3 rounded-lg border border-neutral-700 px-4 py-2 disabled:opacity-50">{vocabulary.NOTIFICATIONS_SAVE}</button>
    </section>;
}
