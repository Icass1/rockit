"use client";

import { useEffect, useState, type JSX } from "react";
import Image from "next/image";
import { useStore } from "@nanostores/react";
import { Headphones, MoreHorizontal, Search, UserPlus, X } from "lucide-react";
import type { Friend } from "@/models/interfaces";
import { rockIt } from "@/lib/rockit/rockIt";
import styles from "@/components/Friends/Friends.module.css";

function Avatar({
    imageUrl,
    username,
    online,
}: {
    imageUrl: string | null;
    username: string;
    online?: boolean;
}): JSX.Element {
    const [failed, setFailed] = useState<string | null>(null);
    return (
        <span
            className={styles.directoryAvatar}
            data-online={online}
            aria-hidden="true"
        >
            {imageUrl && failed !== imageUrl ? (
                <Image
                    src={imageUrl}
                    alt=""
                    width={44}
                    height={44}
                    onError={() => setFailed(imageUrl)}
                />
            ) : (
                username.slice(0, 1).toUpperCase()
            )}
        </span>
    );
}

export default function FriendsList({
    friends,
}: {
    friends: Friend[];
}): JSX.Element {
    const blocked = useStore(rockIt.friendManager.blockedAtom);
    const v = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const results = useStore(rockIt.friendManager.searchResultsAtom);
    const [query, setQuery] = useState("");
    const [searching, setSearching] = useState(false);
    const [settledQuery, setSettledQuery] = useState("");
    const [busy, setBusy] = useState<string | null>(null);
    const [confirm, setConfirm] = useState<{
        id: string;
        action: "remove" | "block";
    } | null>(null);
    const showResults = query.trim().length >= 2;
    useEffect(() => {
        if (query.trim().length < 2) return;
        let current = true;
        const timer = setTimeout(() => {
            setSearching(true);
            void rockIt.friendManager.searchUsers(query.trim()).finally(() => {
                if (current) {
                    setSearching(false);
                    setSettledQuery(query.trim());
                }
            });
        }, 250);
        return () => {
            current = false;
            clearTimeout(timer);
        };
    }, [query]);
    const run = async (
        id: string,
        action: () => Promise<unknown>
    ): Promise<void> => {
        setBusy(id);
        try {
            await action();
        } finally {
            setBusy(null);
            setConfirm(null);
        }
    };
    const sorted = [...friends].sort(
        (a, b) =>
            Number(b.isOnline) - Number(a.isOnline) ||
            a.username.localeCompare(b.username)
    );
    return (
        <div className={styles.directory}>
            <div className={styles.searchField}>
                <Search size={18} aria-hidden="true" />
                <input
                    aria-label={v.FRIENDS_SEARCH_PLACEHOLDER}
                    type="search"
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={v.FRIENDS_SEARCH_PLACEHOLDER}
                    maxLength={100}
                />
                {query && (
                    <button aria-label={v.CANCEL} onClick={() => setQuery("")}>
                        <X size={18} aria-hidden="true" />
                    </button>
                )}
            </div>
            {showResults ? (
                <div
                    aria-live="polite"
                    aria-busy={searching || settledQuery !== query.trim()}
                >
                    {searching || settledQuery !== query.trim() ? (
                        <p className={styles.directoryHint}>
                            {v.SEARCH_LOADING}
                        </p>
                    ) : results.length === 0 ? (
                        <p className={styles.directoryHint}>{v.NO_RESULTS}</p>
                    ) : (
                        results.map((user) => (
                            <div
                                key={user.publicId}
                                className={styles.directoryRow}
                            >
                                <Avatar
                                    imageUrl={user.imageUrl}
                                    username={user.username}
                                />
                                <span className={styles.personName}>
                                    {user.username}
                                </span>
                                {user.isFriend ? (
                                    <span className={styles.directoryHint}>
                                        {v.FRIENDS_ALREADY_FRIENDS}
                                    </span>
                                ) : user.requestSent ? (
                                    <span className={styles.directoryHint}>
                                        {v.FRIENDS_PENDING}
                                    </span>
                                ) : (
                                    <button
                                        className={styles.addFriend}
                                        disabled={busy !== null}
                                        aria-label={`${v.FRIENDS_ADD}: ${user.username}`}
                                        onClick={() => {
                                            void run(user.publicId, () =>
                                                rockIt.friendManager.sendRequest(
                                                    user.publicId
                                                )
                                            );
                                        }}
                                    >
                                        <UserPlus
                                            size={18}
                                            aria-hidden="true"
                                        />
                                    </button>
                                )}
                            </div>
                        ))
                    )}
                </div>
            ) : friends.length === 0 ? (
                <div className={styles.directoryEmpty}>
                    <UsersEmpty />
                    <p>{v.FRIENDS_NO_FRIENDS}</p>
                    <p>{v.FRIENDS_SEARCH_PLACEHOLDER}</p>
                </div>
            ) : (
                <ul className={styles.directoryList}>
                    {sorted.map((friend) => (
                        <li key={friend.publicId}>
                            <div className={styles.directoryRow}>
                                <Avatar
                                    imageUrl={friend.imageUrl}
                                    username={friend.username}
                                    online={friend.isOnline}
                                />
                                <div className={styles.personCopy}>
                                    <span className={styles.personName}>
                                        {friend.username}
                                    </span>
                                    <span className={styles.personAction}>
                                        {friend.isOnline
                                            ? v.FRIENDS_ONLINE
                                            : v.FRIENDS_OFFLINE}
                                        {friend.nowPlaying &&
                                            ` · ${friend.nowPlaying}`}
                                    </span>
                                </div>
                                {friend.isOnline && (
                                    <button
                                        className={styles.inviteButton}
                                        disabled={busy !== null}
                                        title={v.FRIENDS_INVITE}
                                        aria-label={`${v.FRIENDS_INVITE}: ${friend.username}`}
                                        onClick={() => {
                                            void run(friend.publicId, () =>
                                                rockIt.listenTogetherManager.invite(
                                                    friend.publicId
                                                )
                                            );
                                        }}
                                    >
                                        <Headphones
                                            size={18}
                                            aria-hidden="true"
                                        />
                                    </button>
                                )}
                                <details
                                    className={styles.personMenu}
                                    onKeyDown={(e) => {
                                        if (e.key === "Escape") {
                                            e.currentTarget.open = false;
                                            e.currentTarget
                                                .querySelector("summary")
                                                ?.focus();
                                        }
                                    }}
                                    onBlur={(e) => {
                                        if (
                                            !e.currentTarget.contains(
                                                e.relatedTarget
                                            )
                                        )
                                            e.currentTarget.open = false;
                                    }}
                                >
                                    <summary
                                        aria-label={`${v.SOCIAL_MANAGE}: ${friend.username}`}
                                    >
                                        <MoreHorizontal
                                            size={18}
                                            aria-hidden="true"
                                        />
                                    </summary>
                                    <div>
                                        <button
                                            onClick={() =>
                                                setConfirm({
                                                    id: friend.publicId,
                                                    action: "remove",
                                                })
                                            }
                                        >
                                            {v.FRIENDS_REMOVE}
                                        </button>
                                        <button
                                            onClick={() =>
                                                setConfirm({
                                                    id: friend.publicId,
                                                    action: "block",
                                                })
                                            }
                                        >
                                            {v.FRIENDS_BLOCK}
                                        </button>
                                    </div>
                                </details>
                            </div>
                            {confirm?.id === friend.publicId && (
                                <div
                                    className={styles.confirmAction}
                                    role="group"
                                    aria-label={friend.username}
                                >
                                    <span>
                                        {confirm.action === "block"
                                            ? v.FRIENDS_BLOCK
                                            : v.FRIENDS_REMOVE}
                                        : {friend.username}?
                                    </span>
                                    <button
                                        disabled={busy !== null}
                                        onClick={() => {
                                            void run(friend.publicId, () =>
                                                confirm.action === "block"
                                                    ? rockIt.friendManager.blockUser(
                                                          friend.publicId
                                                      )
                                                    : rockIt.friendManager.removeFriend(
                                                          friend.publicId
                                                      )
                                            );
                                        }}
                                    >
                                        {confirm.action === "block"
                                            ? v.FRIENDS_BLOCK
                                            : v.FRIENDS_REMOVE}
                                    </button>
                                    <button onClick={() => setConfirm(null)}>
                                        {v.CANCEL}
                                    </button>
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            )}
            {blocked.length > 0 && (
                <details className={styles.blocked}>
                    <summary>
                        {v.FRIENDS_BLOCKED} · {blocked.length}
                    </summary>
                    {blocked.map((user) => (
                        <div
                            key={user.publicId}
                            className={styles.directoryRow}
                        >
                            <span className={styles.personName}>
                                {user.username}
                            </span>
                            <button
                                disabled={busy !== null}
                                onClick={() => {
                                    void run(user.publicId, () =>
                                        rockIt.friendManager.unblockUser(
                                            user.publicId
                                        )
                                    );
                                }}
                            >
                                {v.FRIENDS_UNBLOCK}
                            </button>
                        </div>
                    ))}
                </details>
            )}
        </div>
    );
}

function UsersEmpty(): JSX.Element {
    return <UserPlus size={28} strokeWidth={1.25} aria-hidden="true" />;
}
