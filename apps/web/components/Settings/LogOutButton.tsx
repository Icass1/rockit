"use client";

import { JSX } from "react";
import { useStore } from "@nanostores/react";
import { LogOut } from "lucide-react";
import { networkStatus } from "@/lib/stores/networkStatus";
import { useRuntimeServices } from "@/components/providers/RuntimeProvider";
import { useVocabulary } from "@/components/providers/VocabularyProvider";

export default function LogOutButton(): JSX.Element {
    const { userManager } = useRuntimeServices();
    const $vocabulary = useVocabulary();
    const $networkStatus = useStore(networkStatus);

    return (
        <button
            type="button"
            disabled={$networkStatus === "offline"}
            onClick={(): Promise<void> => userManager.signOut()}
            className="flex items-center justify-center gap-2 rounded-xl bg-red-600/20 px-4 py-2.5 text-sm font-semibold text-red-400 transition-colors hover:bg-red-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
            <LogOut className="h-4 w-4" />
            {$vocabulary.LOG_OUT}
        </button>
    );
}
