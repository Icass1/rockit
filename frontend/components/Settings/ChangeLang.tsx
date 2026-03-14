import { VocabularyResponseSchema } from "@/dto";
import { useStore } from "@nanostores/react";
import useFetch from "@/hooks/useFetch";
import { rockIt } from "@/lib/rockit/rockIt";

export default function ChangeLang() {
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const $lang = useStore(rockIt.vocabularyManager.langAtom);

    const avalibaleLangs = useFetch("/vocabulary", VocabularyResponseSchema);

    return (
        <div>
            <label className="mb-2 block text-sm text-gray-300 md:text-lg">
                {$vocabulary.LANGUAGE}
            </label>
            <select
                value={$lang}
                onChange={(event) => {
                    rockIt.userManager.setLangAsync(event.currentTarget.value);
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
