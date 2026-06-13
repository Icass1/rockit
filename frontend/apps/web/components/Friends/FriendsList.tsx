"use client";

import { useState, type JSX } from "react";
import { useStore } from "@nanostores/react";
import { rockIt } from "@/lib/rockit/rockIt";
import Image from "next/image";
import { Search, X, UserPlus, Music2, MoreHorizontal, UserMinus } from "lucide-react";

interface Friend {
    publicId: string;
    username: string;
    imageUrl: string | null;
    isOnline: boolean;
    nowPlaying: string | null;
    level: number;
    levelTitle: string | null;
    status: string;
    dateAdded: string;
}

function Avatar({
    imageUrl,
    username,
    size,
    online,
}: {
    imageUrl: string | null;
    username: string;
    size: number;
    online?: boolean;
}): JSX.Element {
    return (
        <div className="relative shrink-0">
            <div
                className="overflow-hidden rounded-full bg-neutral-800"
                style={{ width: size, height: size }}
            >
                {imageUrl ? (
                    <Image
                        src={imageUrl}
                        alt={username}
                        width={size}
                        height={size}
                        className="h-full w-full object-cover"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm font-bold text-neutral-500">
                        {username[0]?.toUpperCase()}
                    </div>
                )}
            </div>
            {online && (
                <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-black bg-green-500" />
            )}
        </div>
    );
}

export default function FriendsList({
    friends,
}: {
    friends: Friend[];
}): JSX.Element {
    const [query, setQuery] = useState("");
    const [openMenu, setOpenMenu] = useState<string | null>(null);

    const $searchResults = useStore(rockIt.friendManager.searchResultsAtom);

    const handleSearch = async (q: string): Promise<void> => {
        setQuery(q);
        if (q.trim().length >= 2) {
            await rockIt.friendManager.searchUsers(q.trim());
        }
    };

    const showResults = query.trim().length >= 2;

    return (
        <div className="flex flex-col gap-4">

            <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-600" />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="Search users..."
                    className="w-full rounded-full bg-neutral-900 py-2.5 pl-10 pr-9 text-sm text-white placeholder-neutral-600 outline-none ring-1 ring-white/[0.06] transition-shadow focus:ring-[#ee1086]/40"
                />
                {query && (
                    <button
                        onClick={() => { setQuery(""); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 transition-colors hover:text-white"
                    >
                        <X size={15} />
                    </button>
                )}
            </div>

            {showResults && (
                <div className="flex flex-col gap-1 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-2">
                    <p className="px-2 pb-1 pt-0.5 text-[10px] font-semibold uppercase tracking-widest text-neutral-600">
                        Results
                    </p>
                    {$searchResults.length === 0 ? (
                        <p className="px-2 py-3 text-sm text-neutral-600">
                            No users found
                        </p>
                    ) : (
                        $searchResults.map((user) => (
                            <div
                                key={user.publicId}
                                className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-white/[0.04]"
                            >
                                <Avatar
                                    imageUrl={user.imageUrl}
                                    username={user.username}
                                    size={36}
                                />
                                <span className="flex-1 text-sm text-white">
                                    {user.username}
                                </span>
                                {user.isFriend ? (
                                    <span className="text-xs text-neutral-600">
                                        Friends
                                    </span>
                                ) : user.requestSent ? (
                                    <span className="text-xs text-neutral-500">
                                        Request sent
                                    </span>
                                ) : (
                                    <button
                                        onClick={() =>
                                            rockIt.friendManager.sendRequest(
                                                user.publicId
                                            )
                                        }
                                        className="flex items-center gap-1.5 rounded-full bg-[#ee1086] px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-80"
                                    >
                                        <UserPlus size={12} />
                                        Add
                                    </button>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}

            {!showResults && (
                <>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-600">
                        My Friends · {friends.length}
                    </p>

                    {friends.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 py-14 text-center">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.04]">
                                <Music2 className="h-5 w-5 text-neutral-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-neutral-400">
                                    No friends yet
                                </p>
                                <p className="mt-1 text-xs text-neutral-600">
                                    Search above to find people
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-0.5">
                            {friends.map((friend) => (
                                <div
                                    key={friend.publicId}
                                    className="group relative flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-white/[0.03]"
                                >
                                    <Avatar
                                        imageUrl={friend.imageUrl}
                                        username={friend.username}
                                        size={40}
                                        online={friend.isOnline}
                                    />

                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium text-white">
                                            {friend.username}
                                        </p>
                                        {friend.nowPlaying ? (
                                            <p className="truncate text-xs text-[#ee1086]">
                                                ▶ {friend.nowPlaying}
                                            </p>
                                        ) : (
                                            <p
                                                className={`text-xs ${
                                                    friend.isOnline
                                                        ? "text-green-500"
                                                        : "text-neutral-700"
                                                }`}
                                            >
                                                {friend.isOnline
                                                    ? "Online"
                                                    : "Offline"}
                                            </p>
                                        )}
                                    </div>

                                    <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-medium text-neutral-500">
                                        Lv.{friend.level}
                                    </span>

                                    <div className="relative">
                                        <button
                                            onClick={() =>
                                                setOpenMenu(
                                                    openMenu === friend.publicId
                                                        ? null
                                                        : friend.publicId
                                                )
                                            }
                                            className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-700 opacity-0 transition-all group-hover:opacity-100 hover:bg-white/[0.06] hover:text-neutral-400"
                                        >
                                            <MoreHorizontal size={15} />
                                        </button>

                                        {openMenu === friend.publicId && (
                                            <div className="absolute right-0 top-9 z-10 min-w-[140px] overflow-hidden rounded-xl border border-white/[0.08] bg-neutral-950 shadow-2xl">
                                                <button
                                                    onClick={() => {
                                                        rockIt.friendManager.removeFriend(
                                                            friend.publicId
                                                        );
                                                        setOpenMenu(null);
                                                    }}
                                                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-400 transition-colors hover:bg-white/[0.04]"
                                                >
                                                    <UserMinus size={14} />
                                                    Remove friend
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
