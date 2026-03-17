"use client";

import { useStore } from "@nanostores/react";
import { LogOut } from "lucide-react";
import { rockIt } from "@/lib/rockit/rockIt";

export default function LogOutButton() {
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);

    return (
        <button
            type="button"
            onClick={() => rockIt.userManager.signOut()}
            className="flex items-center justify-center gap-2 rounded-xl bg-red-600/20 px-4 py-2.5 text-sm font-semibold text-red-400 transition-colors hover:bg-red-600 hover:text-white"
        >
            <LogOut className="h-4 w-4" />
            {$vocabulary.LOG_OUT}
        </button>
    );
}
