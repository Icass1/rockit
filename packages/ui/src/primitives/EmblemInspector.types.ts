import type { ReactNode } from "react";
import type { ListeningBadgeResponse, Vocabulary } from "@rockit/shared";

export interface EmblemInspectorProps {
    preview?: ReactNode;
    badge: ListeningBadgeResponse;
    ownerName: string;
    vocabulary: Vocabulary;
}
