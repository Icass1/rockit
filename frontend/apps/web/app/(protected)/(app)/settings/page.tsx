import { rockIt } from "@/lib/rockit/rockIt";
import SettingsClient from "./SettingsClient";

export default async function SettingsPage() {
    const vocabulary = (await rockIt.vocabularyManager.getVocabulary()) ?? {
        vocabulary: {},
        currentLang: "en",
    };

    return <SettingsClient vocabulary={vocabulary} />;
}
