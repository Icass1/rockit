"use client";

import { useEffect, useId, useRef, useState, type JSX } from "react";
import { useStore } from "@nanostores/react";
import { LoaderCircle } from "lucide-react";
import styles from "@/components/Friends/Friends.module.css";
import { useRuntimeServices } from "@/components/providers/RuntimeProvider";
import { useVocabulary } from "@/components/providers/VocabularyProvider";

function ShareForm({ publicId }: { publicId: string }): JSX.Element {
    const { friendManager, sharingManager } = useRuntimeServices();
    const recipientId = useId();
    const messageId = useId();
    const ref = useRef<HTMLDialogElement>(null);
    const friends = useStore(friendManager.friendsAtom);
    const v = useVocabulary();
    const [recipient, setRecipient] = useState("");
    const [message, setMessage] = useState("");
    const [sending, setSending] = useState(false);
    useEffect(() => {
        const dialog = ref.current;
        dialog?.showModal();
        void friendManager.fetchFriends();
        return () => {
            if (dialog?.open) dialog.close();
        };
    }, [friendManager]);
    return (
        <dialog
            ref={ref}
            aria-labelledby="share-media-title"
            onCancel={() => sharingManager.closeComposer()}
            className={styles.dialog}
        >
            <form
                className={styles.form}
                onSubmit={async (event) => {
                    event.preventDefault();
                    if (sending) return;
                    setSending(true);
                    try {
                        if (
                            await sharingManager.shareMedia(
                                recipient,
                                publicId,
                                message || undefined
                            )
                        )
                            sharingManager.closeComposer();
                    } finally {
                        setSending(false);
                    }
                }}
            >
                <h2 id="share-media-title">{v.FRIENDS_SHARE}</h2>
                <label
                    htmlFor={recipientId}
                    className="flex flex-col gap-2 text-sm"
                >
                    {v.FRIENDS_SHARE_TO}
                    <select
                        id={recipientId}
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
                <label
                    htmlFor={messageId}
                    className="flex flex-col gap-2 text-sm"
                >
                    {v.FRIENDS_SHARE_MESSAGE}
                    <textarea
                        id={messageId}
                        maxLength={2000}
                        value={message}
                        onChange={(event) => setMessage(event.target.value)}
                        className="rounded-lg bg-neutral-800 p-3"
                    />
                </label>
                <div className="flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={() => sharingManager.closeComposer()}
                        className="rounded-full px-4 py-2"
                    >
                        {v.CANCEL}
                    </button>
                    <button
                        type="submit"
                        aria-busy={sending}
                        disabled={sending || !recipient}
                        className="rounded-full bg-[#ee1086] px-4 py-2 disabled:opacity-40"
                    >
                        {sending && (
                            <LoaderCircle
                                className="mr-2 inline h-4 w-4 animate-spin motion-reduce:animate-none"
                                aria-hidden
                            />
                        )}
                        {v.FRIENDS_SHARE}
                    </button>
                </div>
            </form>
        </dialog>
    );
}

export default function ShareMediaDialog(): JSX.Element | null {
    const { friendManager, sharingManager } = useRuntimeServices();
    const scope = useStore(friendManager.scopeAtom);
    const publicId = useStore(sharingManager.composeMediaAtom);
    return publicId ? (
        <ShareForm key={`${scope}:${publicId}`} publicId={publicId} />
    ) : null;
}
