"use client";

import { type JSX } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@nanostores/react";
import { notificationText, type NotificationResponse } from "@rockit/shared";
import { notificationInbox } from "@/lib/notificationInbox";
import { rockIt } from "@/lib/rockit/rockIt";

export default function NotificationMenu(): JSX.Element {
    const router = useRouter();
    const items = useStore(notificationInbox.items);
    const total = useStore(notificationInbox.total);
    const error = useStore(notificationInbox.error);
    const vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const open = async (item: NotificationResponse): Promise<void> => {
        await notificationInbox.read(item.publicId);
        if (item.destination) {
            const destination = await notificationInbox.destination(
                item.publicId
            );
            if (destination) router.push(destination);
        }
    };
    return (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-lg bg-neutral-800 p-3 text-white shadow-xl">
            <p className="mb-2 font-bold">{vocabulary.NOTIFICATIONS}</p>
            {error && (
                <p role="alert" className="text-sm">
                    {vocabulary.NOTIFICATION_LOAD_FAILED}
                </p>
            )}
            <ul className="max-h-72 overflow-y-auto">
                {items.length === 0 && (
                    <li className="py-4 text-sm text-neutral-400">
                        {vocabulary.NOTIFICATION_EMPTY}
                    </li>
                )}
                {items.map((item) => (
                    <li key={item.publicId}>
                        <button
                            type="button"
                            onClick={(): void => {
                                void open(item);
                            }}
                            className={`w-full rounded p-2 text-left text-sm hover:bg-neutral-700 ${item.readAt ? "text-neutral-400" : "font-semibold"}`}
                        >
                            {notificationText(item, vocabulary)}
                        </button>
                    </li>
                ))}
            </ul>
            {items.length < total && (
                <button
                    type="button"
                    onClick={(): void => {
                        void notificationInbox.refresh(true);
                    }}
                    className="mt-2 text-sm"
                >
                    {vocabulary.NOTIFICATION_MORE}
                </button>
            )}
        </div>
    );
}
