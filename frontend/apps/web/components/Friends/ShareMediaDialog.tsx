"use client";

import { useEffect, useRef, useState, type JSX } from "react";
import { useStore } from "@nanostores/react";
import { rockIt } from "@/lib/rockit/rockIt";

function ShareForm({ publicId }: { publicId: string }): JSX.Element {
    const ref = useRef<HTMLDialogElement>(null);
    const friends = useStore(rockIt.friendManager.friendsAtom);
    const v = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const [recipient, setRecipient] = useState("");
    const [message, setMessage] = useState("");
    const [sending, setSending] = useState(false);
    useEffect(() => {
        ref.current?.showModal();
        void rockIt.friendManager.fetchFriends();
    }, []);
    return (
        <dialog
            ref={ref}
            onCancel={() => rockIt.sharingManager.closeComposer()}
            className="m-auto w-[min(92vw,28rem)] rounded-2xl border border-white/10 bg-neutral-950 p-6 text-white backdrop:bg-black/70"
        >
            <form
                className="flex flex-col gap-4"
                onSubmit={async (event) => {
                    event.preventDefault();
                    if (sending) return;
                    setSending(true);
                    try {
                        if (
                            await rockIt.sharingManager.shareMedia(
                                recipient,
                                publicId,
                                message || undefined
                            )
                        )
                            rockIt.sharingManager.closeComposer();
                    } finally {
                        setSending(false);
                    }
                }}
            >
                <h2 className="text-xl font-bold">{v.FRIENDS_SHARE}</h2>
                <label className="flex flex-col gap-2 text-sm">
                    {v.FRIENDS_SHARE_TO}
                    <select
                        required
                        value={recipient}
                        onChange={(event) => setRecipient(event.target.value)}
                        className="rounded-lg bg-neutral-800 p-3"
                    >
                        <option value="" disabled>
                            {v.FRIENDS_SHARE_TO}
                        </option>
                        {friends.map((friend) => (
                            <option
                                key={friend.publicId}
                                value={friend.publicId}
                            >
                                {friend.username}
                            </option>
                        ))}
                    </select>
                </label>
                {friends.length === 0 && (
                    <p className="text-sm text-neutral-400">
                        {v.FRIENDS_NO_FRIENDS}
                    </p>
                )}
                <label className="flex flex-col gap-2 text-sm">
                    {v.FRIENDS_SHARE_MESSAGE}
                    <textarea
                        maxLength={2000}
                        value={message}
                        onChange={(event) => setMessage(event.target.value)}
                        className="rounded-lg bg-neutral-800 p-3"
                    />
                </label>
                <div className="flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={() => rockIt.sharingManager.closeComposer()}
                        className="rounded-full px-4 py-2"
                    >
                        {v.CANCEL}
                    </button>
                    <button
                        disabled={sending || !recipient}
                        className="rounded-full bg-[#ee1086] px-4 py-2 disabled:opacity-40"
                    >
                        {v.FRIENDS_SHARE}
                    </button>
                </div>
            </form>
        </dialog>
    );
}

export default function ShareMediaDialog(): JSX.Element | null {
    const publicId = useStore(rockIt.sharingManager.composeMediaAtom);
    return publicId ? <ShareForm key={publicId} publicId={publicId} /> : null;
}
