"use client";

import { useState } from "react";
import Image from "next/image";
import ContextMenuOption from "@/components/ContextMenu/Option";
import type { UserList } from "@/components/ListSongs/hooks/useSongContextMenu";

interface ListSubContextMenuProps {
    songId: string;
    list: UserList;
}

export default function ListSubContextMenu({
    songId,
    list,
}: ListSubContextMenuProps) {
    const [checked, setChecked] = useState(list.containSong);

    const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const adding = e.target.checked;
        const endpoint = adding
            ? "/api/playlist/add-song"
            : "/api/playlist/remove-song";

        try {
            const res = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ playlistId: list.id, songId }),
            });
            if (res.ok) setChecked(adding);
        } catch {
            // Non-fatal — checkbox reverts to original state on failure
        }
    };

    return (
        <ContextMenuOption closeOnClick={false} onClick={() => {}}>
            <label className="flex cursor-pointer flex-row items-center gap-3 rounded-md transition-colors hover:bg-neutral-700">
                <input
                    checked={checked}
                    onChange={handleChange}
                    type="checkbox"
                    className="rockit-checkbox relative h-5 w-5"
                />
                <Image
                    width={24}
                    height={24}
                    alt={list.name}
                    className="h-6 w-6 rounded"
                    src={list.image}
                />
                {list.name}
            </label>
        </ContextMenuOption>
    );
}
