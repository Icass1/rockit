"use client";

import type { JSX } from "react";
import { useStore } from "@nanostores/react";
import { OnlinePresence } from "@rockit/ui/primitives/OnlinePresence";
import { rockIt } from "@/lib/rockit/rockIt";
import {
    useLanguage,
    useVocabulary,
} from "@/components/providers/VocabularyProvider";

export default function OnlineUserIndicator(): JSX.Element {
    const count = useStore(rockIt.webSocketManager.onlineUsersAtom);
    const vocabulary = useVocabulary();
    const locale = useLanguage();
    return (
        <OnlinePresence
            count={count}
            label={vocabulary.ONLINE_LABEL}
            locale={locale}
            iconSize={28}
        />
    );
}
