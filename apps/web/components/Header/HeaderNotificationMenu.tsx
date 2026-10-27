"use client";

import { useState, type JSX } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@nanostores/react";
import { X } from "lucide-react";
import { rockIt } from "@/lib/rockit/rockIt";
import { notificationVocabularyText, replaceNotificationGaps } from "@/lib/notifications";
import HeaderPopover from "@/components/Header/HeaderPopover";

export default function NotificationMenu({ onClose }: { onClose: () => void }): JSX.Element {
    const manager = rockIt.notificationManager;
    const notifications = useStore(manager.notificationsAtom);
    const unread = useStore(manager.unreadCountAtom);
    const total = useStore(manager.totalCountAtom);
    const error = useStore(manager.errorAtom);
    const vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const lang = useStore(rockIt.vocabularyManager.langAtom);
    const [unreadOnly, setUnreadOnly] = useState(false);
    const router = useRouter();
    return (
        <HeaderPopover id="notification-center" label={vocabulary.NOTIFICATIONS_TITLE} className="w-[min(25rem,calc(100vw-2rem))]">
            <div className="flex items-center gap-2 p-4">
                <h2 className="flex-1 font-semibold">{vocabulary.NOTIFICATIONS_TITLE} {unread > 0 && `(${unread})`}</h2>
                <button onClick={onClose} aria-label={vocabulary.NOTIFICATIONS_CLOSE}><X size={18} /></button>
            </div>
            <label className="flex gap-2 px-4 pb-3 text-sm">
                <input type="checkbox" checked={unreadOnly} onChange={(event) => {
                    setUnreadOnly(event.target.checked); manager.setPage(0, event.target.checked);
                }} />{vocabulary.NOTIFICATIONS_UNREAD}
            </label>
            {error && <p role="alert" className="px-4 text-sm text-red-400">{vocabulary.NOTIFICATIONS_LOAD_FAILED}</p>}
            <ul className="max-h-[60dvh] overflow-y-auto">
                {!notifications.length && <li className="p-4 text-neutral-400">{vocabulary.NOTIFICATIONS_EMPTY}</li>}
                {notifications.map((item) => (
                    <li key={item.publicId} className="border-t border-white/10 p-4">
                        <p className={item.readAt ? "text-neutral-400" : "font-medium"}>{replaceNotificationGaps(notificationVocabularyText(vocabulary, item.vocabularyKey), item.replacements)}</p>
                        <time className="text-xs text-neutral-500" dateTime={item.dateAdded}>{new Date(item.dateAdded).toLocaleString(lang || "en")}</time>
                        <div className="mt-2 flex gap-4 text-sm">
                            {item.destination && <button onClick={() => { void manager.destinationAsync(item).then((url) => { if (url) { router.push(url); onClose(); } }); }}>{vocabulary.NOTIFICATIONS_OPEN}</button>}
                            {!item.readAt && <button onClick={() => void manager.markRead(item.publicId)}>{vocabulary.NOTIFICATIONS_MARK_READ}</button>}
                        </div>
                    </li>
                ))}
            </ul>
            <div className="flex justify-between border-t border-white/10 p-4 text-sm">
                <button disabled={!manager.offset} onClick={() => manager.setPage(manager.offset - 20, unreadOnly)}>{vocabulary.NOTIFICATIONS_PREVIOUS}</button>
                <button disabled={manager.offset + 20 >= total} onClick={() => manager.setPage(manager.offset + 20, unreadOnly)}>{vocabulary.NOTIFICATIONS_NEXT}</button>
            </div>
        </HeaderPopover>
    );
}
