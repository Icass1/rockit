"use client";

import { rockitIt } from "@/lib/rockit";
import { useStore } from "@nanostores/react";
import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

export default function LogOutButton() {
    const lang = useStore(rockitIt.languageManager.langDataAtom);

    if (!lang) return false;

    const handleLogOut = () => {
        console.warn("LogOutButton signOut");
        signOut();
    };

    return (
        <button
            onClick={handleLogOut}
            className="flex items-center justify-center gap-2 rounded-lg bg-red-700 px-3 py-2 font-bold text-white shadow-md transition duration-300 hover:bg-red-900"
        >
            <LogOut className="h-5 w-5" />
            {lang.log_out}
        </button>
    );
}
