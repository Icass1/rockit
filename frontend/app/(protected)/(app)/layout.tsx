import { rockIt } from "@/lib/rockit/rockIt";
import AppClientLayout from "@/components/Layout/AppClientLayout";

export default async function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const vocabulary = await rockIt.vocabularyManager.getVocabulary();

    return (
        <AppClientLayout vocabulary={vocabulary}>{children}</AppClientLayout>
    );
}
