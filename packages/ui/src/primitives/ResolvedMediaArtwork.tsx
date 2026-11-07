"use client";

import type { ArtworkResolver } from "@rockit/shared";
import { useArtworkCandidate } from "@rockit/ui/headless/useArtworkCandidate";
import { MediaArtwork } from "@rockit/ui/primitives/MediaArtwork";

export function ResolvedMediaArtwork({
    resolver,
    uri,
    provider,
    artist,
    track,
    size,
}: {
    resolver: ArtworkResolver;
    uri?: string | null;
    provider: string;
    artist: string;
    track: string;
    size?: number;
}) {
    const artwork = useArtworkCandidate(resolver, uri, provider, artist, track);
    return (
        <MediaArtwork
            uri={artwork.uri}
            label={track}
            size={size}
            onError={artwork.reportFailure}
        />
    );
}
