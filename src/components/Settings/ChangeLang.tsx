import { lang as currentLang, langData } from "@/stores/lang";
import { useStore } from "@nanostores/react";

export default function ChangeLang() {
    const $currentLang = useStore(currentLang);

    const $lang = useStore(langData);
    if (!$lang) return;

    return (
        <div>
            <label className="block text-gray-300 text-sm md:text-lg mb-2">
                {$lang.language}
            </label>
            <select
                value={$currentLang}
                onChange={(event) => {
                    currentLang.set(event.currentTarget.value);
                }}
                className="w-full p-3 rounded-lg bg-[#1e1e1e] text-white border border-[#333] focus:outline-none focus:ring-2 focus:ring-[#ec5588]"
            >
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="eu">Euskera</option>
                <option value="fr">Français</option>
                <option value="it">Italiano</option>
                <option value="de">Deutsch</option>
                <option value="zh">中文</option>
                <option value="ja">日本語</option>
                <option value="ar">عربي</option>
            </select>
        </div>
    );
}
