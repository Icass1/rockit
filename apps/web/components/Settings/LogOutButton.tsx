"use client";

import { JSX } from "react";
import { LogOut } from "lucide-react";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useRuntimeServices } from "@/components/providers/RuntimeProvider";
import { useVocabulary } from "@/components/providers/VocabularyProvider";

export default function LogOutButton(): JSX.Element {
    const { userManager } = useRuntimeServices();
    const $vocabulary = useVocabulary();
    const $networkStatus = useNetworkStatus();

    return (
        <button
            type="button"
            disabled={$networkStatus === "offline"}
            onClick={(): Promise<void> => userManager.signOut()}
            className="bg-destructive-hover/20 text-destructive-soft hover:bg-destructive-hover hover:text-foreground-strong flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40"
        >
            <LogOut className="h-4 w-4" />
            {$vocabulary.LOG_OUT}
        </button>
    );
}
