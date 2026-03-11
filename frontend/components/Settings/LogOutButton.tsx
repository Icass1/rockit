"use client";

import { useStore } from "@nanostores/react";
import { LogOut } from "lucide-react";
import { rockIt } from "@/lib/rockit/rockIt";

export default function LogOutButton() {
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);

    const handleLogOut = () => {
        console.warn("LogOutButton signOut");
        rockIt.userManager.signOut();
    };

    return (
        <button
            onClick={handleLogOut}
            className="flex items-center justify-center gap-2 rounded-lg bg-red-700 px-3 py-2 font-bold text-white shadow-md transition duration-300 hover:bg-red-900"
        >
            <LogOut className="h-5 w-5" />
            {$vocabulary.LOG_OUT}
        </button>
    );
}
