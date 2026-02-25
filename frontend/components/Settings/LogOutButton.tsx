"use client";

import { rockIt } from "@/lib/rockit/rockIt";
import { useLanguage } from "@/contexts/LanguageContext";
import { LogOut } from "lucide-react";

export default function LogOutButton() {
    const { langFile: lang } = useLanguage();

    if (!lang) return false;

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
            {lang.log_out}
        </button>
    );
}
