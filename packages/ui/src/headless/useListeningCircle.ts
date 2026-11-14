import { useMemo, useState } from "react";
import type { Friend } from "@rockit/shared";

/** Selection is local UI state; presence and tracks always come from current data. */
export function useListeningCircle(
    friends: readonly Friend[],
    limit: number,
    radius: number
) {
    const [selectedId, select] = useState<string>();
    const members = useMemo(
        () =>
            [...friends]
                .sort(
                    (a, b) =>
                        Number(b.isOnline && !!b.nowPlaying?.trim()) -
                            Number(a.isOnline && !!a.nowPlaying?.trim()) ||
                        Number(b.isOnline) - Number(a.isOnline) ||
                        a.username.localeCompare(b.username) ||
                        a.publicId.localeCompare(b.publicId)
                )
                .slice(0, limit),
        [friends, limit]
    );
    const slots = useMemo(
        () =>
            members.map((friend, index) => {
                const angle =
                    -Math.PI / 2 + (index * Math.PI * 2) / members.length;
                return {
                    friend,
                    x: 50 + Math.cos(angle) * radius,
                    y: 50 + Math.sin(angle) * radius,
                };
            }),
        [members, radius]
    );
    return {
        slots,
        selected:
            friends.find((friend) => friend.publicId === selectedId) ??
            members[0],
        onlineCount: friends.filter((friend) => friend.isOnline).length,
        select,
    };
}
