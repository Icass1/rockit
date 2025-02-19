import { langData } from "@/stores/lang";
import { useStore } from "@nanostores/react";
import { navigate } from "astro:transitions/client";
import { LogOut } from "lucide-react";

export default function LogOutButton() {
    const $lang = useStore(langData);
    if (!$lang) return;

    const handleLogOut = () => {
        fetch("/api/logout").then((response) => {
            if (response.ok) {
                navigate("/login");
            }
        });
    };

    return (
        <button
            onClick={handleLogOut}
            className="px-3 py-2 bg-red-700 text-white rounded-lg font-bold shadow-md hover:bg-red-900 transition duration-300 flex items-center justify-center gap-2"
        >
            <LogOut className="w-5 h-5" />
            {$lang.log_out}
        </button>
    );
}
