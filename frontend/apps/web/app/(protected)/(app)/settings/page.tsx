import SettingsClient from "@/app/(protected)/(app)/settings/SettingsClient";
import { rockIt } from "@/lib/rockit/rockIt";

export default async function SettingsPage() {
    const vocabulary = (await rockIt.vocabularyManager.getVocabulary()) ?? {
        vocabulary: {},
        currentLang: "en",
    };

    return <SettingsClient vocabulary={vocabulary} />;
}
