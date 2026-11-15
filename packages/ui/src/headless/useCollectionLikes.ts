import { useEffect, useRef, useState } from "react";
import { getCollectionSongIds, setCollectionSongsLiked } from "@rockit/shared";
import type { BaseHttp } from "@rockit/shared";
import { useAsyncResource } from "@rockit/ui/headless/useAsyncResource";

/** Collection membership and mutations are shared by both menu presenters. */
export function useCollectionLikes(
    http: typeof BaseHttp,
    publicId: string,
    scope: string,
    isCurrent: () => boolean,
    enabled = true
) {
    const generation = useRef(0);
    const mounted = useRef(false);
    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
        };
    }, []);
    useEffect(() => {
        generation.current++;
        return () => {
            generation.current++;
        };
    }, [publicId, scope, enabled]);
    const [busy, setBusy] = useState(false);
    const resource = useAsyncResource(
        async () => {
            const [ids, response] = await Promise.all([
                getCollectionSongIds(http, publicId),
                http.getLikedMedia(),
            ]);
            if (!response.isOk()) throw new Error(response.message);
            const liked = new Set(response.result.media);
            return {
                ids,
                allLiked: ids.length > 0 && ids.every((id) => liked.has(id)),
            };
        },
        `${scope}:${publicId}`,
        enabled
    );
    const toggle = async () => {
        if (!resource.data || busy || !isCurrent()) return;
        const stamp = generation.current;
        setBusy(true);
        try {
            await setCollectionSongsLiked(
                http,
                resource.data.ids,
                !resource.data.allLiked,
                isCurrent
            );
        } finally {
            if (mounted.current) setBusy(false);
            if (generation.current === stamp && isCurrent()) {
                await resource.refresh();
            }
        }
    };
    return { ...resource, busy, toggle };
}
