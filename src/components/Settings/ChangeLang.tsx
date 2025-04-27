import { lang as currentLang, langData } from "@/stores/lang";
import { useStore } from "@nanostores/react";

export default function ChangeLang() {
    const $currentLang = useStore(currentLang);

    const $lang = useStore(langData);
    if (!$lang) return;

    return (
        <div>
            <label className="mb-2 block text-sm text-gray-300 md:text-lg">
                {$lang.language}
            </label>
            <select
                value={$currentLang}
                onChange={(event) => {
                    currentLang.set(event.currentTarget.value);
                }}
                className="w-full rounded-lg border border-[#333] bg-[#1e1e1e] p-3 text-white focus:ring-2 focus:ring-[#ec5588] focus:outline-none"
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
