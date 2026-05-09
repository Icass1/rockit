import { redirect } from "next/navigation";
import { rockIt } from "@/lib/rockit/rockIt";
import AppClientLayout from "@/components/Layout/AppClientLayout";

export default async function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const t1 = new Date().getTime();

    const vocabularyData = await rockIt.vocabularyManager.getVocabulary();
    console.log(
        "rockIt.vocabularyManager.getVocabulary()",
        new Date().getTime() - t1
    );

    if (vocabularyData.isNotOk()) {
        if (vocabularyData.code === 401) {
            return redirect("/login");
        }
        console.error(
            "Error fetching vocabulary in AppLayout: ",
            vocabularyData.message,
            vocabularyData.detail
        );
    }

    const vocabulary = vocabularyData.isOk()
        ? vocabularyData.result
        : {
              vocabulary: {},
              currentLang: "en",
          };

    return (
        <AppClientLayout vocabulary={vocabulary}>{children}</AppClientLayout>
    );
}
