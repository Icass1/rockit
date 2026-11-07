"use client";

import {
    createContext,
    useContext,
    useMemo,
    type JSX,
    type ReactNode,
} from "react";
import { RecommendationArtworkManager } from "@/lib/managers/recommendationArtworkManager";

const ArtworkContext = createContext<RecommendationArtworkManager | undefined>(
    undefined
);

export function RecommendationArtworkProvider({
    children,
}: {
    children: ReactNode;
}): JSX.Element {
    const manager = useMemo(() => new RecommendationArtworkManager(), []);
    return <ArtworkContext value={manager}>{children}</ArtworkContext>;
}

export function useRecommendationArtwork(): RecommendationArtworkManager {
    const manager = useContext(ArtworkContext);
    // Standalone recommendation surfaces can also own an isolated cache.
    return useMemo(
        () => manager ?? new RecommendationArtworkManager(),
        [manager]
    );
}
